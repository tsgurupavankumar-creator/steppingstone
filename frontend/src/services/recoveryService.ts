export interface QueuedAnswer {
  question_number: number;
  selected_option: string | null;
  is_marked_for_review?: boolean;
  time_spent_delta: number;
  queued_at: number;
}

const QUEUE_PREFIX = 'exam_recovery_queue_';

export const recoveryService = {
  getQueueKey(examId: string, participantId: string): string {
    return `${QUEUE_PREFIX}${examId}_${participantId}`;
  },

  getQueuedAnswers(examId: string, participantId: string): QueuedAnswer[] {
    try {
      const data = localStorage.getItem(this.getQueueKey(examId, participantId));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  enqueueAnswer(examId: string, participantId: string, item: QueuedAnswer): void {
    try {
      const queue = this.getQueuedAnswers(examId, participantId);
      // Remove any existing entry for this question so only the latest is queued
      const filtered = queue.filter((q) => q.question_number !== item.question_number);
      filtered.push(item);
      localStorage.setItem(this.getQueueKey(examId, participantId), JSON.stringify(filtered));
    } catch (e) {
      console.error('Failed to enqueue answer to recovery storage', e);
    }
  },

  clearQueue(examId: string, participantId: string): void {
    try {
      localStorage.removeItem(this.getQueueKey(examId, participantId));
    } catch {
      // ignore
    }
  },

  hasPendingOfflineAnswers(examId: string, participantId: string): boolean {
    return this.getQueuedAnswers(examId, participantId).length > 0;
  },
};
