export interface CarpetaCompartida {
  _id: string;
  nombre: string;
  carpetaPadreId?: string | null;
  estado: 'activa' | 'papelera' | 'eliminada';
}
