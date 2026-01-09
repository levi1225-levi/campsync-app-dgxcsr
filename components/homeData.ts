
export interface ModalDemo {
  route: string;
  title: string;
  description: string;
  color: string;
}

export const modalDemos: ModalDemo[] = [
  {
    route: '/modal',
    title: 'Standard Modal',
    description: 'Full-screen modal presentation',
    color: '#007AFF',
  },
  {
    route: '/formsheet',
    title: 'Form Sheet',
    description: 'Adjustable sheet with grab handle',
    color: '#34C759',
  },
  {
    route: '/transparent-modal',
    title: 'Transparent Modal',
    description: 'Custom transparent overlay',
    color: '#FF9500',
  },
];
