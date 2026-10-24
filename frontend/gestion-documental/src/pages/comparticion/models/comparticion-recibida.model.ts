import { ArchivoCompartido } from "./archivo-compartido.model";
import { CarpetaCompartida } from "./carpeta-compartida.model";
import { UsuarioCompartidor } from "./usuario-compartidor.model";

export interface ComparticionRecibida {
  _id: string;
  propietarioId: UsuarioCompartidor;
  tipoRecurso: 'archivo' | 'carpeta';
  archivoId: ArchivoCompartido | null;
  carpetaId: CarpetaCompartida | null;
  tipoPermiso: 'lectura' | 'edicion';
  fechaComparticion: string;
  estado: 'activa' | 'revocada';
}
