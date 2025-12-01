import type { CreateWebPDFArgs } from './web.types';

export async function createWebPDF(_: CreateWebPDFArgs): Promise<void> {
  throw new Error('Web PDF exporter is not available on native platforms.');
}
