export interface Carpeta {
  _id: string;
  nombre: string;
  propietarioId: string;
  carpetaPadreId: string | null;
  fechaCreacion: string;
  fechaModificacion: string;
  estado: 'activa' | 'papelera' | 'eliminada';
}
