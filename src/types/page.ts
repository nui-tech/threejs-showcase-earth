export interface Page {
  create(): HTMLElement;
  destroy(): void;
  getTitle(): string;
}