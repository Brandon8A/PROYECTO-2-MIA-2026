import { RegistroActividad } from "./registro-actividad.model";

export interface RespuestaHistorialActividad {
  total: number;
  cantidadDevuelta: number;
  limite: number;
  actividades: RegistroActividad[];
}
