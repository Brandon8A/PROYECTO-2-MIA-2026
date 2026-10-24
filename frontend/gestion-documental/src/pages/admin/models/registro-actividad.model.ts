import { UsuarioActividad } from "./usuario-actividad.model";

export interface RegistroActividad {
  id: string;
  usuario: UsuarioActividad | null;
  tipoOperacion: string;
  recursoTipo: string;
  recursoId: string | null;
  fechaHora: string;
  detalles: Record<string, unknown> | string;
}
