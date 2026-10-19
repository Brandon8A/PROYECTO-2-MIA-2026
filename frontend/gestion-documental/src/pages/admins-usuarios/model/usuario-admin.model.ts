export interface UsuarioAdmin {
  _id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  rol: 'admin' | 'usuario';
  estado: 'activo' | 'inactivo';
  fechaCreacion: string;
}
