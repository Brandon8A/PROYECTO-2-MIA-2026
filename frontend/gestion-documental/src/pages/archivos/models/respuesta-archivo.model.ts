import { Archivo } from "./archivo.model";

export interface RespuestaArchivo {
  mensaje?: string;
  archivo: Archivo;
  permiso?: 'lectura' | 'edicion';
  esPropietario?: boolean;
}
