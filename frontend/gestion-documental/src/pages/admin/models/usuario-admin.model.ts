import { AlmacenamientoUsuario } from "./alamcenamiento-usuario.model";

export interface UsuarioAdmin {
  _id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  rol: 'admin' | 'usuario';
  estado: 'activo' | 'inactivo';
  almacenamiento: AlmacenamientoUsuario;
  fechaCreacion: string;
}
