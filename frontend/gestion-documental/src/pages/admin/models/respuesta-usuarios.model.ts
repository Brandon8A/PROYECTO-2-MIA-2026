import { UsuarioAdmin } from "./usuario-admin.model";

export interface RespuestaUsuarios {
  total: number;
  usuarios: UsuarioAdmin[];
}
