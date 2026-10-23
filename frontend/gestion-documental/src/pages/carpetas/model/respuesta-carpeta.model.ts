import { Carpeta } from "./carpeta.model";

export interface RespuestaCarpeta {
  mensaje?: string;
  carpeta: Carpeta;
  subcarpetas?: Carpeta[];
}
