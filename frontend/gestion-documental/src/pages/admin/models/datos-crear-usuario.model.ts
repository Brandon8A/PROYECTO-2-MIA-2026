import { AlmacenamientoUsuario } from "./alamcenamiento-usuario.model";

export interface DatosCrearUsuario {
  nombres: string;
  apellidos: string;
  correo: string;
  password: string;
  rol: 'admin' | 'usuario';
  estado: 'activo' | 'inactivo';
  almacenamiento: AlmacenamientoUsuario;
}
