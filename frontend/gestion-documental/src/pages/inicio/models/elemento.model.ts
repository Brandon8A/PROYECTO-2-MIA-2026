export interface Elemento {
  id: string;
  nombre: string;
  tipo: TipoElemento;
  extension?: ExtensionArchivo;
  carpetaPadreId: string | null;
  fechaModificacion: Date;
  enPapelera?: boolean;
  compartidoPor?: string;
  correoCompartidor?: string;
  permisoCompartido?: 'lectura' | 'edicion';
}

type TipoElemento = 'carpeta' | 'archivo';
export type ExtensionArchivo = 'md' | 'txt';
