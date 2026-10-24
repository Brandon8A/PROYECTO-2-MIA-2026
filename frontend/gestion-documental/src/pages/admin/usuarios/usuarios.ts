import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { DatosActualizarUsuario, UsuariosAdminService } from '../../../services/usuarios-admin-service';
import { UsuarioAdmin } from '../models/usuario-admin.model';
import { DatosCrearUsuario } from '../models/datos-crear-usuario.model';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth';

type ModoFormulario = 'crear' | 'editar';

@Component({
  selector: 'app-usuarios-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css'
})
export class UsuariosAdmin implements OnInit {
  private readonly usuariosService = inject(UsuariosAdminService)
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  usuarios: UsuarioAdmin[] = [];
  busqueda = '';

  cargando = false;
  guardando = false;
  error = '';
  mensaje = '';

  modalAbierto = false;
  modoFormulario: ModoFormulario = 'crear';
  usuarioEditando: UsuarioAdmin | null = null;

  formulario = this.formularioVacio();

  private formularioVacio() {
    return {
      nombres: '',
      apellidos: '',
      correo: '',
      password: '',
      rol: 'usuario' as 'admin' | 'usuario',
      estado: 'activo' as 'activo' | 'inactivo',
      capacidadGiB: 5
    };
  }

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  get usuariosFiltrados(): UsuarioAdmin[] {
    const termino = this.normalizar(this.busqueda);

    return this.usuarios.filter(usuario => {
      const texto = [
        usuario.nombres,
        usuario.apellidos,
        usuario.correo,
        usuario.rol,
        usuario.estado
      ].join(' ');

      return this.normalizar(texto).includes(termino);
    });
  }

  get totalActivos(): number {
    return this.usuarios.filter(u => u.estado === 'activo').length;
  }

  get totalInactivos(): number {
    return this.usuarios.filter(u => u.estado === 'inactivo').length;
  }

  private normalizar(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase()
      .trim();
  }
  /*
    cargarUsuarios(): void {
      this.cargando = true;
      this.error = '';

      this.usuariosService.listar()
        .pipe(finalize(() => this.cargando = false))
        .subscribe({
          next: respuesta => {
            console.log('Respuesta completa:', respuesta);
            console.log('Lista de usuarios:', respuesta.usuarios);

            this.usuarios = respuesta.usuarios;

            console.log('Usuarios asignados:', this.usuarios.length);
            console.log('Estado de carga antes de finalizar:', this.cargando);
          },
          error: error => {
            console.error('Error al cargar usuarios:', error);
            this.error =
              error.error?.mensaje ??
              'No se pudo cargar la lista de usuarios.';
          }
        });
    }
  */


  cargarUsuarios(): void {
    this.cargando = true;
    this.error = '';

    this.usuariosService.listar()
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: respuesta => {
          this.usuarios = respuesta.usuarios;
          this.cdr.detectChanges();
        },
        error: error => {
          console.error('Error al cargar usuarios:', error);

          this.error =
            error.error?.mensaje ??
            'No se pudo cargar la lista de usuarios.';
        }
      });
  }


  abrirCrear(): void {
    this.modoFormulario = 'crear';
    this.usuarioEditando = null;
    this.formulario = this.formularioVacio();
    this.error = '';
    this.mensaje = '';
    this.modalAbierto = true;
  }

  abrirEditar(usuario: UsuarioAdmin): void {
    this.modoFormulario = 'editar';
    this.usuarioEditando = usuario;
    this.error = '';
    this.mensaje = '';

    this.formulario = {
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      correo: usuario.correo,
      password: '',
      rol: usuario.rol,
      estado: usuario.estado,
      capacidadGiB: usuario.almacenamiento.capacidad / (1024 ** 3)
    };

    this.modalAbierto = true;
  }

  cerrarModal(): void {
    if (this.guardando) {
      return
    }

    this.modalAbierto = false;
    this.usuarioEditando = null;
  }

  guardarUsuario(): void {
    this.error = ''
    this.mensaje = ''

    if (!this.formulario.nombres.trim() || !this.formulario.apellidos.trim() || !this.formulario.correo.trim()) {
      this.error = 'Completa los nombres, apellidos y correo.';
      return
    }

    if (this.modoFormulario === 'crear' && !this.formulario.password) {
      this.error = 'Debes establecer una contraseña para el usuario.'
      return
    }

    if (!Number.isFinite(this.formulario.capacidadGiB) || this.formulario.capacidadGiB < 0) {
      this.error = 'La capacidad de almacenamiento no es válida.'
      return
    }

    const capacidad = this.formulario.capacidadGiB * (1024 ** 3)

    const almacenamiento = {
      capacidad,
      utilizado: this.usuarioEditando?.almacenamiento.utilizado ?? 0,
      disponible: Math.max(0, capacidad - (this.usuarioEditando?.almacenamiento.utilizado ?? 0))
    }

    this.guardando = true

    if (this.modoFormulario === 'crear') {
      const datos: DatosCrearUsuario = {
        nombres: this.formulario.nombres.trim(),
        apellidos: this.formulario.apellidos.trim(),
        correo: this.formulario.correo.trim().toLowerCase(),
        password: this.formulario.password,
        rol: this.formulario.rol,
        estado: this.formulario.estado,
        almacenamiento
      }

      this.usuariosService.crear(datos)
        .pipe(finalize(() => this.guardando = false))
        .subscribe({
          next: respuesta => {
            this.mensaje = respuesta.mensaje;
            this.modalAbierto = false;
            this.cargarUsuarios();
          },
          error: error => {
            this.error =
              error.error?.mensaje ??
              'No se pudo crear el usuario.';
          }
        });

      return;
    }

    if (!this.usuarioEditando) {
      this.guardando = false;
      this.error = 'No se ha seleccionado un usuario para editar.';
      return;
    }

    const datos: DatosActualizarUsuario = {
      nombres: this.formulario.nombres.trim(),
      apellidos: this.formulario.apellidos.trim(),
      correo: this.formulario.correo.trim().toLowerCase(),
      rol: this.formulario.rol,
      estado: this.formulario.estado,
      almacenamiento
    };

    if (this.formulario.password) {
      datos.password = this.formulario.password;
    }

    this.usuariosService
      .actualizar(this.usuarioEditando._id, datos)
      .pipe(finalize(() => this.guardando = false))
      .subscribe({
        next: respuesta => {
          this.mensaje = respuesta.mensaje;
          this.modalAbierto = false;
          this.cargarUsuarios();
        },
        error: error => {
          this.error =
            error.error?.mensaje ??
            'No se pudo actualizar el usuario.';
        }
      });
  }

  cambiarEstado(usuario: UsuarioAdmin): void {
    const nuevoEstado = usuario.estado === 'activo' ? 'inactivo' : 'activo';

    const confirmado = window.confirm(
      `¿Deseas ${nuevoEstado === 'activo' ? 'activar' : 'inactivar'} la cuenta de ${usuario.nombres} ${usuario.apellidos}?`
    )

    if (!confirmado) {
      return
    }

    this.error = '';
    this.mensaje = '';

    this.usuariosService
      .cambiarEstado(usuario._id, nuevoEstado)
      .subscribe({
        next: respuesta => {
          this.mensaje = respuesta.mensaje;
          this.cargarUsuarios();
        },
        error: error => {
          this.error =
            error.error?.mensaje ??
            'No se pudo cambiar el estado del usuario.';
        }
      });
  }

  formatearFecha(fecha: string): string {
    return new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium' }).format(new Date(fecha))
  }

  formatearAlmacenamiento(bytes: number): string {
    return `${(bytes / (1024 ** 3)).toFixed(2)} GiB`
  }

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
