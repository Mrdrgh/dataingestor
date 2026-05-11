import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ComputeProfileService } from '../compute-profiles/compute-profile.service';
import { KernelSession } from './kernel-session';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Manages all active KernelSessions across notebooks.
 * Maps notebookId -> KernelSession.
 */
@Injectable()
export class KernelAdapterService implements OnModuleDestroy {
  private readonly logger = new Logger(KernelAdapterService.name);
  private readonly sessions = new Map<string, KernelSession>();

  constructor(
    private readonly computeProfileService: ComputeProfileService,
  ) {}

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down all kernel sessions...');
    const shutdowns = Array.from(this.sessions.values()).map((s) =>
      s.shutdown().catch((e) =>
        this.logger.warn(`Error shutting down kernel: ${e}`),
      ),
    );
    await Promise.all(shutdowns);
    this.sessions.clear();
  }

  /**
   * Start a kernel for a notebook. Returns the kernel ID.
   */
  async startKernel(
    notebookId: string,
    computeProfileId: string,
    onMessage: (msg: Record<string, unknown>) => void,
    onStatusChange: (status: string) => void,
  ): Promise<string> {
    // If there's already a session for this notebook, shut it down first
    const existing = this.sessions.get(notebookId);
    if (existing?.isAlive) {
      this.logger.log(
        `Shutting down existing kernel for notebook ${notebookId}`,
      );
      await existing.shutdown();
    }

    const profile =
      await this.computeProfileService.findOne(computeProfileId);

    const session = new KernelSession(
      profile.kernel_gateway_url,
      profile.auth_token,
      notebookId,
      IDLE_TIMEOUT_MS,
      onMessage,
      (status) => {
        onStatusChange(status);
        // Clean up the map when kernel dies
        if (status === 'dead') {
          this.sessions.delete(notebookId);
        }
      },
    );

    const kernelId = await session.start('python3');
    this.sessions.set(notebookId, session);
    return kernelId;
  }

  /**
   * Execute code on the kernel for a given notebook.
   */
  executeCode(notebookId: string, cellId: string, code: string): string {
    const session = this.sessions.get(notebookId);
    if (!session || !session.isAlive) {
      throw new Error(
        `No active kernel for notebook ${notebookId}. Send kernel:start first.`,
      );
    }
    return session.execute(cellId, code);
  }

  /**
   * Interrupt the running execution for a notebook's kernel.
   */
  async interruptKernel(notebookId: string): Promise<void> {
    const session = this.sessions.get(notebookId);
    if (session?.isAlive) {
      await session.interrupt();
    }
  }

  /**
   * Restart the kernel for a notebook (clears kernel state).
   */
  async restartKernel(notebookId: string): Promise<void> {
    const session = this.sessions.get(notebookId);
    if (session?.isAlive) {
      await session.restart();
    }
  }

  /**
   * Shut down the kernel for a notebook.
   */
  async shutdownKernel(notebookId: string): Promise<void> {
    const session = this.sessions.get(notebookId);
    if (session) {
      await session.shutdown();
      this.sessions.delete(notebookId);
    }
  }

  /**
   * Check if a notebook has an active kernel.
   */
  hasActiveKernel(notebookId: string): boolean {
    const session = this.sessions.get(notebookId);
    return session?.isAlive ?? false;
  }
}
