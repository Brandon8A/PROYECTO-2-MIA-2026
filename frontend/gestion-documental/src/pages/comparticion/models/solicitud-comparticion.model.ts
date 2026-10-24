import { TipoPermisoCompartido, TipoRecursoCompartido } from "../../../services/comparticiones-service";

export interface SolicitudComparticion {
  correo: string;
  tipoRecurso: TipoRecursoCompartido;
  recursoId: string;
  tipoPermiso: TipoPermisoCompartido;
}
