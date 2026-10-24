import { ComparticionRecibida } from "./comparticion-recibida.model";

export interface RespuestaComparticionesRecibidas {
  total: number;
  comparticiones: ComparticionRecibida[];
}
