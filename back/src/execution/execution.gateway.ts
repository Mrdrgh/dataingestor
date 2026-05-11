import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'ws';
import { KernelAdapterService } from './kernel-adapter.service';

/**
 * WebSocket gateway for notebook cell execution.
 *
 * Clients connect to ws://host:3001/ws/notebook and exchange JSON messages
 * to manage kernel lifecycle and execute code. See implementation_plan.md
 * for the full message protocol.
 */
@WebSocketGateway({ path: '/ws/notebook' })
export class ExecutionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ExecutionGateway.name);

  /** Track which notebooks each client is connected to for cleanup */
  private clientNotebooks = new Map<unknown, Set<string>>();

  constructor(private readonly kernelAdapter: KernelAdapterService) {}

  handleConnection(client: import('ws')): void {
    this.logger.log('Client connected to notebook WS');
    this.clientNotebooks.set(client, new Set());

    client.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());
        this.handleClientMessage(client, msg);
      } catch (err) {
        this.sendToClient(client, {
          type: 'error',
          message: 'Invalid JSON message',
        });
      }
    });
  }

  handleDisconnect(client: import('ws')): void {
    this.logger.log('Client disconnected from notebook WS');

    // Shut down all kernels this client was using
    const notebooks = this.clientNotebooks.get(client);
    if (notebooks) {
      for (const notebookId of notebooks) {
        this.kernelAdapter
          .shutdownKernel(notebookId)
          .catch((e) =>
            this.logger.warn(
              `Error cleaning up kernel for ${notebookId}: ${e}`,
            ),
          );
      }
    }
    this.clientNotebooks.delete(client);
  }

  private async handleClientMessage(
    client: import('ws'),
    msg: Record<string, unknown>,
  ): Promise<void> {
    const type = msg.type as string;

    switch (type) {
      case 'kernel:start':
        await this.handleKernelStart(client, msg);
        break;

      case 'cell:execute':
        this.handleCellExecute(client, msg);
        break;

      case 'kernel:interrupt':
        await this.handleKernelInterrupt(client, msg);
        break;

      case 'kernel:restart':
        await this.handleKernelRestart(client, msg);
        break;

      case 'kernel:shutdown':
        await this.handleKernelShutdown(client, msg);
        break;

      default:
        this.sendToClient(client, {
          type: 'error',
          message: `Unknown message type: ${type}`,
        });
    }
  }

  private async handleKernelStart(
    client: import('ws'),
    msg: Record<string, unknown>,
  ): Promise<void> {
    const notebookId = msg.notebook_id as string;
    const computeProfileId = msg.compute_profile_id as string;

    if (!notebookId || !computeProfileId) {
      this.sendToClient(client, {
        type: 'kernel:error',
        notebook_id: notebookId,
        message: 'notebook_id and compute_profile_id are required',
      });
      return;
    }

    try {
      const kernelId = await this.kernelAdapter.startKernel(
        notebookId,
        computeProfileId,
        // onMessage — forward kernel messages to the client
        (kernelMsg) => this.sendToClient(client, kernelMsg),
        // onStatusChange — forward kernel status to the client
        (status) =>
          this.sendToClient(client, {
            type: 'kernel:status',
            notebook_id: notebookId,
            status,
          }),
      );

      this.clientNotebooks.get(client)?.add(notebookId);

      this.sendToClient(client, {
        type: 'kernel:ready',
        notebook_id: notebookId,
        kernel_id: kernelId,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to start kernel';
      this.logger.error(`kernel:start failed: ${message}`);
      this.sendToClient(client, {
        type: 'kernel:error',
        notebook_id: notebookId,
        message,
      });
    }
  }

  private handleCellExecute(
    client: import('ws'),
    msg: Record<string, unknown>,
  ): void {
    const notebookId = msg.notebook_id as string;
    const cellId = msg.cell_id as string;
    const code = msg.code as string;

    if (!notebookId || !cellId || !code) {
      this.sendToClient(client, {
        type: 'cell:error',
        cell_id: cellId,
        ename: 'ValidationError',
        evalue: 'notebook_id, cell_id, and code are required',
        traceback: [],
      });
      return;
    }

    try {
      this.kernelAdapter.executeCode(notebookId, cellId, code);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Execution failed';
      this.sendToClient(client, {
        type: 'cell:error',
        cell_id: cellId,
        ename: 'KernelError',
        evalue: message,
        traceback: [],
      });
    }
  }

  private async handleKernelInterrupt(
    client: import('ws'),
    msg: Record<string, unknown>,
  ): Promise<void> {
    const notebookId = msg.notebook_id as string;
    if (notebookId) {
      await this.kernelAdapter.interruptKernel(notebookId);
    }
  }

  private async handleKernelRestart(
    client: import('ws'),
    msg: Record<string, unknown>,
  ): Promise<void> {
    const notebookId = msg.notebook_id as string;
    if (notebookId) {
      await this.kernelAdapter.restartKernel(notebookId);
      this.sendToClient(client, {
        type: 'kernel:status',
        notebook_id: notebookId,
        status: 'restarting',
      });
    }
  }

  private async handleKernelShutdown(
    client: import('ws'),
    msg: Record<string, unknown>,
  ): Promise<void> {
    const notebookId = msg.notebook_id as string;
    if (notebookId) {
      await this.kernelAdapter.shutdownKernel(notebookId);
      this.clientNotebooks.get(client)?.delete(notebookId);
    }
  }

  private sendToClient(
    client: import('ws'),
    msg: Record<string, unknown>,
  ): void {
    if (client.readyState === 1 /* OPEN */) {
      client.send(JSON.stringify(msg));
    }
  }
}
