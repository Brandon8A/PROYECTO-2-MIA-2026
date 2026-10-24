import { TipoPermisoCompartido, TipoRecursoCompartido } from "../../../services/comparticiones-service";

export interface RespuestaComparticion {
  mensaje: string;
  comparticion: {
    _id: string;
    propietarioId: string;
    usuarioReceptorId: string;
    tipoRecurso: TipoRecursoCompartido;
    archivoId: string | null;
    carpetaId: string | null;
    tipoPermiso: TipoPermisoCompartido;
    fechaComparticion?: string;
    estado: 'activa' | 'revocada';
  };
}
