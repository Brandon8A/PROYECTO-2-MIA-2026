export interface Archivo {
  _id: string;
  nombre: string;
  extension: '.md' | '.txt';
  tipoMime: string;
  tamano: number;
  propietarioId: string;
  carpetaId: string | null;
  fechaCreacion: string;
  fechaModificacion: string;
  fechaEliminacion: string | null;
  estado: 'activo' | 'papelera' | 'eliminado';
}
