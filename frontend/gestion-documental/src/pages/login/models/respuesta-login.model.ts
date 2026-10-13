import { UsuarioAutenticado } from "./usuario-autenticado.model";

export interface RespuestaLogin{
  mensaje: string;
  token: string;
  usuario: UsuarioAutenticado;
}
