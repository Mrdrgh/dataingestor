import { Logger } from '@nestjs/common';
import WebSocket from 'ws';
import { v4 as uuid } from 'uuid';

/**
 * Represents a single kernel session on a remote Jupyter Kernel Gateway.
 * Manages the lifecycle of one kernel: start, execute, interrupt, restart, shutdown.
 */
export class KernelSession {
  private readonly logger = new Logger(KernelSession.name);
  private ws: WebSocket | null = null;
  private kernelId: string | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  /** Maps msg_id -> cell_id so we can tag responses back to the correct cell */
  private pendingExecutions = new Map<string, string>();

  constructor(
    private readonly gatewayUrl: string,
    private readonly authToken: string | null,
    private readonly notebookId: string,
    private readonly idleTimeoutMs: number,
    private readonly onMessage: (msg: Record<string, unknown>) => void,
    private readonly onStatusChange: (status: string) => void,
  ) {}

  get id(): string | null {
    return this.kernelId;
  }

  get isAlive(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Start a new kernel via the Kernel Gateway REST API, then open
   * a WebSocket to its /channels endpoint for message passing.
   */
  async start(kernelName = 'python3'): Promise<string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.authToken) {
      headers['Authorization'] = `token ${this.authToken}`;
    }

    // POST /api/kernels to create a new kernel
    const response = await fetch(`${this.gatewayUrl}/api/kernels`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: kernelName }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Failed to start kernel: ${response.status} ${text}`,
      );
    }

    const data = (await response.json()) as { id: string };
    this.kernelId = data.id;
    this.logger.log(
      `Kernel ${this.kernelId} started for notebook ${this.notebookId}`,
    );

    // Open WebSocket to kernel channels
    const wsUrl = this.gatewayUrl
      .replace(/^http/, 'ws')
      .concat(`/api/kernels/${this.kernelId}/channels`);

    const wsHeaders: Record<string, string> = {};
    if (this.authToken) {
      wsHeaders['Authorization'] = `token ${this.authToken}`;
    }

    this.ws = new WebSocket(wsUrl, { headers: wsHeaders });

    this.ws.on('message', (raw: WebSocket.Data) => {
      this.resetIdleTimer();
      try {
        const msg = JSON.parse(raw.toString());
        this.handleKernelMessage(msg);
      } catch {
        this.logger.warn('Failed to parse kernel message');
      }
    });

    this.ws.on('error', (err) => {
      this.logger.error(`Kernel WS error: ${err.message}`);
      this.onStatusChange('dead');
    });

    this.ws.on('close', () => {
      this.logger.log(`Kernel WS closed for ${this.kernelId}`);
      this.onStatusChange('dead');
    });

    // Wait for the WebSocket to open
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Kernel WS open timeout')),
        10_000,
      );
      this.ws!.on('open', () => {
        clearTimeout(timeout);
        this.resetIdleTimer();
        resolve();
      });
    });

    this.onStatusChange('idle');
    return this.kernelId;
  }

  /**
   * Execute code on the kernel. Returns the msg_id used to track the execution.
   */
  execute(cellId: string, code: string): string {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Kernel is not connected');
    }

    const msgId = uuid();
    this.pendingExecutions.set(msgId, cellId);

    const msg = {
      header: {
        msg_id: msgId,
        msg_type: 'execute_request',
        username: 'notebook',
        session: this.notebookId,
        date: new Date().toISOString(),
        version: '5.3',
      },
      parent_header: {},
      metadata: {},
      content: {
        code,
        silent: false,
        store_history: true,
        user_expressions: {},
        allow_stdin: false,
        stop_on_error: true,
      },
      buffers: [],
      channel: 'shell',
    };

    this.ws.send(JSON.stringify(msg));
    return msgId;
  }

  /**
   * Interrupt the currently running execution.
   */
  async interrupt(): Promise<void> {
    if (!this.kernelId) return;

    const headers: Record<string, string> = {};
    if (this.authToken) {
      headers['Authorization'] = `token ${this.authToken}`;
    }

    await fetch(
      `${this.gatewayUrl}/api/kernels/${this.kernelId}/interrupt`,
      { method: 'POST', headers },
    );
  }

  /**
   * Restart the kernel (clears all state).
   */
  async restart(): Promise<void> {
    if (!this.kernelId) return;

    const headers: Record<string, string> = {};
    if (this.authToken) {
      headers['Authorization'] = `token ${this.authToken}`;
    }

    await fetch(
      `${this.gatewayUrl}/api/kernels/${this.kernelId}/restart`,
      { method: 'POST', headers },
    );

    this.pendingExecutions.clear();
    this.onStatusChange('restarting');
  }

  /**
   * Shut down the kernel and clean up resources.
   */
  async shutdown(): Promise<void> {
    this.clearIdleTimer();

    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
      this.ws = null;
    }

    if (this.kernelId) {
      try {
        const headers: Record<string, string> = {};
        if (this.authToken) {
          headers['Authorization'] = `token ${this.authToken}`;
        }

        await fetch(
          `${this.gatewayUrl}/api/kernels/${this.kernelId}`,
          { method: 'DELETE', headers },
        );
        this.logger.log(`Kernel ${this.kernelId} deleted`);
      } catch (err) {
        this.logger.warn(
          `Failed to delete kernel ${this.kernelId}: ${err}`,
        );
      }
      this.kernelId = null;
    }

    this.pendingExecutions.clear();
    this.onStatusChange('dead');
  }

  /**
   * Handle an incoming Jupyter protocol message from the kernel,
   * translate it into a simplified format, and forward to the client.
   */
  private handleKernelMessage(msg: Record<string, unknown>): void {
    const header = msg.header as Record<string, unknown> | undefined;
    const parentHeader = msg.parent_header as
      | Record<string, unknown>
      | undefined;
    const content = msg.content as Record<string, unknown> | undefined;
    const msgType = header?.msg_type as string | undefined;

    // Find the cell_id this message belongs to
    const parentMsgId = parentHeader?.msg_id as string | undefined;
    const cellId = parentMsgId
      ? this.pendingExecutions.get(parentMsgId)
      : undefined;

    switch (msgType) {
      case 'status': {
        const state = (content?.execution_state as string) ?? 'unknown';
        this.onStatusChange(state);
        if (cellId) {
          this.onMessage({
            type: 'cell:status',
            cell_id: cellId,
            status: state,
          });
        }
        break;
      }

      case 'stream':
        if (cellId) {
          this.onMessage({
            type: 'cell:stream',
            cell_id: cellId,
            name: content?.name ?? 'stdout',
            text: content?.text ?? '',
          });
        }
        break;

      case 'execute_result':
        if (cellId) {
          this.onMessage({
            type: 'cell:result',
            cell_id: cellId,
            execution_count: content?.execution_count ?? null,
            data: content?.data ?? {},
          });
        }
        break;

      case 'display_data':
        if (cellId) {
          this.onMessage({
            type: 'cell:display_data',
            cell_id: cellId,
            data: content?.data ?? {},
          });
        }
        break;

      case 'error':
        if (cellId) {
          this.onMessage({
            type: 'cell:error',
            cell_id: cellId,
            ename: content?.ename ?? 'Error',
            evalue: content?.evalue ?? '',
            traceback: content?.traceback ?? [],
          });
          // Execution is done for this cell on error
          if (parentMsgId) {
            this.pendingExecutions.delete(parentMsgId);
          }
        }
        break;

      case 'execute_reply': {
        // Final reply — clean up tracking
        if (parentMsgId) {
          this.pendingExecutions.delete(parentMsgId);
        }
        break;
      }

      default:
        // Ignore other message types (e.g. comm_open, comm_msg)
        break;
    }
  }

  private resetIdleTimer(): void {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      this.logger.log(
        `Kernel ${this.kernelId} idle timeout — shutting down`,
      );
      this.shutdown();
    }, this.idleTimeoutMs);
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }
}
