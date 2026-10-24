export interface ArchivoCompartido {
  _id: string;
  nombre: string;
  extension: '.md' | '.txt';
  tipoMime?: string;
  tamano?: number;
  estado: 'activo' | 'papelera' | 'eliminado';
}
