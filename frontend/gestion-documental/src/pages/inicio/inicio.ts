import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router'
import { forkJoin, finalize, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { AuthService } from '../../services/auth';
import { CarpetasService } from '../../services/carpetas';
import { ArchivosService } from '../../services/archivos-service';
import { Elemento, ExtensionArchivo } from './models/elemento.model';
import { ComparticionesService } from '../../services/comparticiones-service';
import { TipoPermisoCompartido } from '../../services/comparticiones-service';
import { ComparticionRecibida } from '../comparticion/models/comparticion-recibida.model';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css'
})
export class Inicio implements OnInit {

  private readonly auth = inject(AuthService)
  private readonly router = inject(Router)
  private readonly cdr = inject(ChangeDetectorRef)

  private readonly carpetasService = inject(CarpetasService)
  private readonly archivosService = inject(ArchivosService)
  private readonly comparticionesService = inject(ComparticionesService)


  elementoCompartir: Elemento | null = null;
  correoCompartir = '';
  permisoCompartir: TipoPermisoCompartido = 'lectura';
  compartiendo = false;

  private elementosBusquedaGlobal: Elemento[] | null = null;
  private busquedaGlobalCargando = false;
  busqueda = '';
  menuNuevoAbierto = false;
  menuElementoId: string | null = null;
  carpetaActualId: string | null = null;
  vistaActual: 'mis-carpetas' | 'compartidos' | 'papelera' = 'mis-carpetas';

  archivoEnEdicion: Elemento | null = null;
  contenidoArchivo = '';
  permisoArchivo: 'lectura' | 'edicion' = 'lectura';
  esPropietarioArchivo = false;
  cargandoContenido = false;
  guardandoContenido = false;

  // Datos ejemplo
  capacidadBytes = 5 * 1024 ** 3;
  utilizadoBytes = 1.2 * 1024 ** 3;

  elementos: Elemento[] = []

  cargando = false
  errorCarga = ''

  ngOnInit(): void {
    this.cargarElementos()
  }

  cargarElementos(): void {
    this.cargando = true
    this.errorCarga = ''

    if (this.vistaActual === 'compartidos') {
      this.comparticionesService.listarRecibidas()
        .pipe(
          finalize(() => {
            this.cargando = false
            this.cdr.detectChanges()
          })
        )
        .subscribe({
          next: (respuesta) => {
            this.elementos = respuesta.comparticiones
              .filter((comparticion: ComparticionRecibida) =>
                comparticion.tipoRecurso === 'archivo'
                  ? comparticion.archivoId !== null
                  : comparticion.carpetaId !== null
              ).map((comparticion: ComparticionRecibida): Elemento => {
                const esArchivo = comparticion.tipoRecurso === 'archivo'
                const archivo = comparticion.archivoId
                const carpeta = comparticion.carpetaId
                const recurso = esArchivo ? archivo! : carpeta!
                const remitente = comparticion.propietarioId

                return {
                  id: recurso._id,
                  nombre: recurso.nombre,
                  tipo: esArchivo ? 'archivo' : 'carpeta',
                  ...(esArchivo
                    ? {
                      extension: archivo!.extension.replace(/^\./, '') as ExtensionArchivo
                    }
                    : {}),
                  carpetaPadreId: esArchivo
                    ? null
                    : carpeta!.carpetaPadreId ?? null,
                  fechaModificacion: new Date(comparticion.fechaComparticion),
                  enPapelera: false,
                  compartidoPor: `${remitente.nombres} ${remitente.apellidos}`.trim(),
                  correoCompartidor: remitente.correo,
                  permisoCompartido: comparticion.tipoPermiso
                }
              })
            this.cdr.detectChanges()
          },
          error: (error) => {
            console.error('Error al cargar los recursos compartidos:', error)
            this.errorCarga = error.error?.mensaje ?? 'No se pudieron cargar los recursos compartidos.'
            this.elementos = []
          }
        })
      return
    }

    // Consultar la papelera desde el backend.
    if (this.vistaActual === 'papelera') {
      forkJoin({
        carpetas: this.carpetasService.listarPapelera(),
        archivos: this.archivosService.listarPapelera()
      }).pipe(finalize(() => {
        this.cargando = false
        this.cdr.detectChanges()
      })).subscribe({
        next: ({ carpetas, archivos }) => {
          const carpetasPapelera: Elemento[] = carpetas.map(carpeta => ({
            id: carpeta._id,
            nombre: carpeta.nombre,
            tipo: 'carpeta',
            carpetaPadreId: carpeta.carpetaPadreId,
            fechaModificacion: new Date(carpeta.fechaModificacion),
            enPapelera: true
          }))

          const archivosPapelera: Elemento[] = archivos.map(archivo => ({
            id: archivo._id,
            nombre: archivo.nombre,
            tipo: 'archivo',
            extension: archivo.extension.replace(/^\./, '') as ExtensionArchivo,
            carpetaPadreId: archivo.carpetaId,
            fechaModificacion: new Date(archivo.fechaModificacion),
            enPapelera: true
          }))

          // La papelera muestra exclusivamente los elementos
          // que devuelve el backend para esa vista.
          this.elementos = [...carpetasPapelera, ...archivosPapelera]
          this.cdr.detectChanges()
        },
        error: error => {
          console.error('Error al cargar la papelera:', error)
          this.errorCarga = error.error?.mensaje ?? 'No se pudo cargar la papelera.'
        }
      })
      return
    }

    // Consultar únicamente el contenido de la ubicación actual.
    forkJoin({
      carpetas: this.carpetasService.listar(this.carpetaActualId),
      archivos: this.archivosService.listar(this.carpetaActualId)
    }).pipe(
      finalize(() => {
        this.cargando = false
        this.cdr.detectChanges()
      })
    ).subscribe({
      next: ({ carpetas, archivos }) => {
        const carpetasMapeadas: Elemento[] = carpetas.map(carpeta => ({
          id: carpeta._id,
          nombre: carpeta.nombre,
          tipo: 'carpeta',
          carpetaPadreId: carpeta.carpetaPadreId,
          fechaModificacion: new Date(carpeta.fechaModificacion),
          enPapelera: false
        }))

        const archivosMapeados: Elemento[] = archivos.map(archivo => ({
          id: archivo._id,
          nombre: archivo.nombre,
          tipo: 'archivo',
          extension: archivo.extension.replace(/^\./, '') as ExtensionArchivo,
          carpetaPadreId: archivo.carpetaId,
          fechaModificacion: new Date(archivo.fechaModificacion),
          enPapelera: false
        }))

        const idsActuales = new Set([
          ...carpetasMapeadas.map(elemento => elemento.id),
          ...archivosMapeados.map(elemento => elemento.id)
        ])

        // Conservar las carpetas necesarias para la navegación
        // y las migas de pan, pero no los archivos de ubicaciones
        // anteriores.
        const carpetasConservadas = this.elementos.filter(
          elemento =>
            elemento.tipo === 'carpeta' && !elemento.enPapelera && !idsActuales.has(elemento.id)
        )

        // Los archivos de la vista anterior se descartan.
        // El contenido actual procede de la respuesta del backend.
        this.elementos = [
          ...carpetasConservadas,
          ...carpetasMapeadas,
          ...archivosMapeados
        ]
        console.log('Ubicación cargada:', this.carpetaActualId)
        console.log('Carpetas recibidas:', carpetas.length)
        console.log('Archivos recibidos:', archivos.length)
        this.cdr.detectChanges()
      },
      error: error => {
        console.error('Error al cargar los elementos:', error);

        this.errorCarga =
          error.error?.mensaje ??
          'No se pudieron cargar las carpetas y los archivos.';

        this.cdr.detectChanges();
      }
    })
  }

  get carpetaActual(): Elemento | undefined {
    return this.elementos.find(
      elemento =>
        elemento.id === this.carpetaActualId &&
        elemento.tipo === 'carpeta' &&
        !elemento.enPapelera
    );
  }

  get rutaCarpetas(): Elemento[] {
    const ruta: Elemento[] = [];
    let id = this.carpetaActualId;

    while (id !== null) {
      const carpeta = this.elementos.find(
        elemento =>
          elemento.id === id &&
          elemento.tipo === 'carpeta' &&
          !elemento.enPapelera
      );

      if (!carpeta) {
        break;
      }

      ruta.unshift(carpeta);
      id = carpeta.carpetaPadreId;
    }

    return ruta;
  }


  get elementosVisibles(): Elemento[] {
    const normalizar = (texto: string): string =>
      texto
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase()
        .trim();

    const termino = normalizar(this.busqueda)
    const elementosFuente = this.vistaActual === 'mis-carpetas' && termino
      ? this.elementosBusquedaGlobal ?? this.elementos
      : this.elementos;
    return elementosFuente
      .filter(elemento => {
        if (this.vistaActual === 'papelera') {
          return elemento.enPapelera === true
        }

        if (this.vistaActual === 'compartidos') {
          return true
        }
        return (elemento.carpetaPadreId === this.carpetaActualId && !elemento.enPapelera)
      }).filter(elemento => {
        if (!termino) {
          return true
        }

        const campos = [
          this.nombreCompleto(elemento),
          elemento.compartidoPor ?? '',
          elemento.correoCompartidor ?? ''
        ]
        return campos.some(campo => normalizar(campo).includes(termino))
      }).sort((a, b) => {
        if (a.tipo !== b.tipo) {
          return a.tipo === 'carpeta' ? -1 : 1
        }
        return a.nombre.localeCompare(b.nombre)
      })
  }

  get cantidadCarpetas(): number {
    return this.elementosVisibles.filter(
      elemento => elemento.tipo === 'carpeta'
    ).length;
  }

  get cantidadArchivos(): number {
    return this.elementosVisibles.filter(
      elemento => elemento.tipo === 'archivo'
    ).length;
  }

  get disponibleBytes(): number {
    return Math.max(0, this.capacidadBytes - this.utilizadoBytes);
  }

  get porcentajeUtilizado(): number {
    if (this.capacidadBytes <= 0) {
      return 0;
    }

    return Math.min(
      100,
      (this.utilizadoBytes / this.capacidadBytes) * 100
    );
  }

  get espacioUtilizadoTexto(): string {
    return this.formatearBytes(this.utilizadoBytes);
  }

  get espacioDisponibleTexto(): string {
    return this.formatearBytes(this.disponibleBytes);
  }

  get capacidadTexto(): string {
    return this.formatearBytes(this.capacidadBytes);
  }

  get puedeEditarArchivo(): boolean {
    return this.esPropietarioArchivo ||
      this.permisoArchivo === 'edicion';
  }

  abrirArchivo(elemento: Elemento): void {
    if (
      elemento.tipo !== 'archivo' ||
      elemento.enPapelera
    ) {
      return;
    }

    this.cerrarMenuElemento();
    this.archivoEnEdicion = elemento;
    this.contenidoArchivo = '';
    this.cargandoContenido = true;
    this.guardandoContenido = false;

    this.archivosService.obtenerDetalle(elemento.id).pipe(
      switchMap(detalle => {
        this.esPropietarioArchivo = detalle.esPropietario;
        this.permisoArchivo = detalle.permiso;

        return this.archivosService.obtenerContenido(elemento.id);
      }),
      finalize(() => {
        this.cargandoContenido = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: contenido => {
        this.contenidoArchivo = contenido;
      },
      error: error => {
        console.error('Error al abrir el archivo:', error);

        this.archivoEnEdicion = null;

        window.alert(
          error.error?.mensaje ??
          'No se pudo abrir el contenido del archivo.'
        );
      }
    });
  }

  guardarContenidoArchivo(): void {
    if (
      !this.archivoEnEdicion ||
      !this.puedeEditarArchivo ||
      this.guardandoContenido
    ) {
      return;
    }

    this.guardandoContenido = true;

    this.archivosService.actualizarContenido(
      this.archivoEnEdicion.id,
      this.contenidoArchivo
    ).pipe(
      finalize(() => {
        this.guardandoContenido = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => {
        window.alert('Contenido guardado correctamente.');
        this.cargarElementos();
      },
      error: error => {
        console.error('Error al guardar el contenido:', error);

        window.alert(
          error.error?.mensaje ??
          'No se pudo guardar el contenido del archivo.'
        );
      }
    });
  }

  cerrarEditorArchivo(): void {
    if (this.guardandoContenido) {
      return;
    }

    this.archivoEnEdicion = null;
    this.contenidoArchivo = '';
    this.permisoArchivo = 'lectura';
    this.esPropietarioArchivo = false;
  }

  abrirCarpeta(elemento: Elemento): void {
    if (elemento.tipo !== 'carpeta' || elemento.enPapelera) {
      return;
    }

    this.carpetaActualId = elemento.id;
    this.busqueda = '';
    this.menuNuevoAbierto = false;
    this.menuElementoId = null;
    this.cargarElementos();
  }

  navegarA(carpeta: Elemento | null): void {
    this.carpetaActualId = carpeta?.id ?? null;
    this.busqueda = '';
    this.menuNuevoAbierto = false;
    this.menuElementoId = null;

    this.cargarElementos();
  }

  alternarMenuNuevo(): void {
    this.menuNuevoAbierto = !this.menuNuevoAbierto;
    this.menuElementoId = null;
  }

  alternarMenuElemento(id: string): void {
    this.menuElementoId = this.menuElementoId === id ? null : id;
    this.menuNuevoAbierto = false;
  }

  crearCarpeta(): void {
    this.menuNuevoAbierto = false
    const nombre = window.prompt('Nombre de la nueva carpeta:');
    if (nombre === null) {
      return;
    }

    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      window.alert('El nombre de la carpeta no puede estar vacio.')
      return
    }

    if (this.existeElemento(nombreLimpio)) {
      window.alert('Ya existe un elemento con ese nombre en esta ubicación.')
      return
    }

    this.carpetasService.crear(nombreLimpio, this.carpetaActualId).subscribe({
      next: carpeta => {
        this.elementos = [
          ...this.elementos,
          {
            id: carpeta._id,
            nombre: carpeta.nombre,
            tipo: 'carpeta',
            carpetaPadreId: carpeta.carpetaPadreId,
            fechaModificacion: new Date(carpeta.fechaModificacion)
          }
        ]
        window.alert('Carpeta creada correctamente.')
      },
      error: error => {
        console.error('Error al crear la carpeta:', error);
        window.alert(error.error?.mensaje ?? 'No se pudo crear la carpeta.')
      }
    })
  }

  crearArchivo(extension: ExtensionArchivo): void {
    this.menuNuevoAbierto = false

    const nombre = window.prompt(`Nombre del archivo .${extension} (sin extensión):`)

    if (nombre === null) {
      return
    }

    const nombreBase = nombre.trim().replace(/\.(md|txt)$/i, '').trim()

    if (!nombreBase) {
      window.alert('Debes ingresar un nombre válido.')
      return
    }

    const nombreCompleto = `${nombreBase}.${extension}`

    if (this.existeElemento(nombreCompleto)) {
      window.alert('Ya existe un elemento con ese nombre en esta ubicación.')
      return
    }

    const tipoMime = extension === 'md' ? 'text/markdown' : 'text/plain'

    const archivoNuevo = new File([''], nombreCompleto, { type: tipoMime })

    this.archivosService.subir(archivoNuevo, this.carpetaActualId).subscribe({
      next: (archivo) => {
        const nuevoElemento: Elemento = {
          id: archivo._id,
          nombre: archivo.nombre,
          tipo: 'archivo',
          extension: archivo.extension.replace(/^\./, '') as ExtensionArchivo,
          carpetaPadreId: archivo.carpetaId,
          fechaModificacion: new Date(archivo.fechaModificacion),
          enPapelera: false
        }

        this.elementos = [
          ...this.elementos.filter(elemento => elemento.id !== nuevoElemento.id),
          nuevoElemento
        ]
        window.alert('Archivo creado correctamente.')
      },
      error: (error) => {
        console.error('Error al crear el archivo:', error)
        window.alert(error.error?.mensaje ?? 'No se pudo crear el archivo.')
      }
    })
  }

  cambiarNombre(elemento: Elemento): void {
    this.cerrarMenuElemento()

    const nombreActual = this.nombreCompleto(elemento);
    const nuevoNombre = window.prompt('Ingresa el nuevo nombre:', nombreActual)
    if (nuevoNombre === null) return;
    let nombreLimpio = nuevoNombre.trim()

    if (!nombreLimpio) {
      window.alert('El nombre no puede estar vacío.')
      return
    }

    if (elemento.tipo === 'archivo') {
      nombreLimpio = nombreLimpio.replace(/\.(md|txt)$/i, '').trim();
    }

    if (!nombreLimpio) {
      window.alert('Ingresa un nombre válido.')
      return
    }

    const nombreComparacion = elemento.tipo === 'archivo'
      ? `${nombreLimpio}.${elemento.extension}`
      : nombreLimpio;

    if (this.existeElementoEnCarpeta(nombreComparacion, elemento.carpetaPadreId, elemento.id)) {
      window.alert('Ya existe un elemento con ese nombre.')
      return
    }

    if (elemento.tipo === 'carpeta') {
      this.carpetasService.actualizar(elemento.id, { nombre: nombreLimpio }).subscribe({
        next: carpeta => {
          this.elementos = this.elementos.map(actual =>
            actual.id === elemento.id
              ? {
                ...actual,
                nombre: carpeta.nombre,
                fechaModificacion: new Date(carpeta.fechaModificacion)
              }
              : actual
          )

          window.alert('Carpeta renombrada correctamente.')
        },
        error: error => {
          console.error('Error al renombrar carpeta:', error)
          window.alert(error.error?.mensaje ?? 'No se pudo cambiar el nombre.')
        }
      })
      return
    }

    // Los archivos se conectarán con su servicio en la siguiente etapa.
    this.elementos = this.elementos.map(actual =>
      actual.id === elemento.id
        ? { ...actual, nombre: nombreLimpio, fechaModificacion: new Date() }
        : actual
    );
  }

  descargarElemento(elemento: Elemento): void {
    this.cerrarMenuElemento()

    if (elemento.tipo === 'carpeta') {
      const contenido = this.obtenerContenidoCarpeta(elemento.id)

      this.descargarBlob(
        JSON.stringify(contenido, null, 2),
        `${elemento.nombre}.json`,
        'application/json'
      )

      return
    }

    const nombre = this.nombreCompleto(elemento)

    this.archivosService.descargar(elemento.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob)
        const enlace = document.createElement('a')

        enlace.href = url
        enlace.download = nombre
        enlace.style.display = 'none'

        document.body.appendChild(enlace)
        enlace.click()
        enlace.remove()

        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      },
      error: error => {
        console.error('Error al descargar el archivo:', error)

        window.alert(error.error?.mensaje ?? 'No se pudo descargar el archivo.')
      }
    });
  }

  compartirElemento(elemento: Elemento): void {
    this.cerrarMenuElemento()
    this.elementoCompartir = elemento
    this.correoCompartir = ''
    this.permisoCompartir = 'lectura'
    this.compartiendo = false
  }

  cerrarFormularioCompartir(): void {
    if (this.compartiendo) {
      return
    }

    this.elementoCompartir = null;
    this.correoCompartir = '';
    this.permisoCompartir = 'lectura';
  }

  confirmarComparticion(): void {
    if (!this.elementoCompartir || this.compartiendo) {
      return
    }

    const correo = this.correoCompartir.trim().toLowerCase()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      window.alert('Ingresa una dirección de correo válida.')
      return
    }

    this.compartiendo = true
    this.comparticionesService.compartir({
      correo,
      tipoRecurso: this.elementoCompartir.tipo,
      recursoId: this.elementoCompartir.id,
      tipoPermiso: this.permisoCompartir
    }).subscribe({
      next: (respuesta) => {
        window.alert(respuesta.mensaje)
        this.elementoCompartir = null
        this.correoCompartir = ''
        this.permisoCompartir = 'lectura'
        this.compartiendo = false
      },
      error: (error) => {
        console.error('Error al compartir el recurso:', error)
        const mensaje = error.error?.mensaje ?? 'No se pudo compartir el recurso. Inténtalo nuevamente.'
        window.alert(mensaje)
        this.compartiendo = false
      }
    })
  }

  moverElemento(elemento: Elemento): void {
    this.cerrarMenuElemento()

    if (elemento.tipo !== 'carpeta') {
      window.alert('El movimiento de archivos se conectará por separado.')
      return
    }

    const carpetasDestino = this.elementos.filter(carpeta =>
      carpeta.tipo === 'carpeta' &&
      !carpeta.enPapelera &&
      carpeta.id !== elemento.id &&
      !this.esDescendiente(carpeta.id, elemento.id)
    )

    const instrucciones = [
      'Escribe el ID de la carpeta de destino.',
      'Deja el campo vacío para mover a Mi unidad.',
      '', ...carpetasDestino.map(carpeta => `${carpeta.nombre} — ID: ${carpeta.id}`)
    ].join('\n')

    const entrada = window.prompt(instrucciones, '')

    if (entrada === null) return

    const idDestino = entrada.trim() || null

    if (idDestino === elemento.carpetaPadreId) {
      window.alert('La carpeta ya está en esa ubicación.')
      return
    }

    if (idDestino !== null) {
      const destino = carpetasDestino.find(c => c.id === idDestino)

      if (!destino) {
        window.alert('La carpeta de destino no es válida.')
        return
      }
    }

    if (this.existeElementoEnCarpeta(elemento.nombre, idDestino, elemento.id)) {
      window.alert('Ya existe una carpeta con ese nombre en el destino.')
      return
    }

    this.carpetasService.actualizar(elemento.id, { carpetaPadreId: idDestino }).subscribe({
      next: carpeta => {
        this.elementos = this.elementos.map(actual =>
          actual.id === elemento.id
            ? {
              ...actual, carpetaPadreId: carpeta.carpetaPadreId, fechaModificacion: new Date(carpeta.fechaModificacion)
            } : actual
        )
        this.cargarElementos()
        window.alert('Carpeta movida correctamente.')
      },
      error: error => {
        console.error('Error al mover carpeta:', error);
        window.alert(error.error?.mensaje ?? 'No se pudo mover la carpeta.')
      }
    })
  }

  verInformacion(elemento: Elemento): void {
    this.cerrarMenuElemento()
    if (elemento.tipo !== 'carpeta') {
      window.alert('La información detallada de archivos se conectará después.');
      return
    }

    this.carpetasService.obtenerPorId(elemento.id).subscribe({
      next: carpeta => {
        const detalles = [
          `Nombre: ${carpeta.nombre}`,
          'Tipo: Carpeta',
          `ID: ${carpeta._id}`,
          `Propietario ID: ${carpeta.propietarioId}`,
          `Ubicación: ${carpeta.carpetaPadreId
            ? this.obtenerRutaCarpeta(carpeta.carpetaPadreId)
            : 'Mi unidad'
          }`,
          `Estado: ${carpeta.estado}`,
          `Fecha de creación: ${new Date(carpeta.fechaCreacion).toLocaleString()
          }`,
          `Última modificación: ${new Date(carpeta.fechaModificacion).toLocaleString()
          }`
        ].join('\n')

        window.alert(detalles)
      },
      error: error => {
        console.error('Error al obtener información:', error)
        window.alert('No se pudo obtener la información de la carpeta.')
      }
    })
  }

  moverAPapelera(elemento: Elemento): void {
    this.cerrarMenuElemento()

    if (elemento.tipo !== 'carpeta') {
      window.alert('La operación de papelera para archivos se conectará después.')
      return
    }

    const confirmado = window.confirm(`¿Deseas mover "${elemento.nombre}" a la papelera?`)

    if (!confirmado) return

    this.carpetasService.enviarAPapelera(elemento.id).subscribe({
      next: () => {
        const ids = new Set<string>([elemento.id]);

        // Marcar en memoria los descendientes que conocemos.
        let cambio = true;

        while (cambio) {
          cambio = false

          for (const actual of this.elementos) {
            if (actual.carpetaPadreId !== null && ids.has(actual.carpetaPadreId) && !ids.has(actual.id)) {
              ids.add(actual.id)
              cambio = true
            }
          }
        }

        this.elementos = this.elementos.map(actual =>
          ids.has(actual.id)
            ? { ...actual, enPapelera: true }
            : actual
        );

        if (ids.has(this.carpetaActualId ?? '')) {
          this.irARaiz()
        } else {
          this.cargarElementos()
        }
        window.alert('Carpeta enviada a la papelera.')
      },
      error: error => {
        console.error('Error al enviar carpeta a papelera:', error)
        window.alert(error.error?.mensaje ?? 'No se pudo enviar la carpeta a la papelera.')
      }
    })
  }

  cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }

  nombreCompleto(elemento: Elemento): string {
    return elemento.tipo === 'archivo'
      ? `${elemento.nombre}.${elemento.extension}`
      : elemento.nombre
  }

  formatearBytes(bytes: number): string {
    if (bytes <= 0) {
      return '0 B';
    }

    const unidades = ['B', 'KB', 'MB', 'GB', 'TB'];
    const indice = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      unidades.length - 1
    );

    const valor = bytes / 1024 ** indice;

    return `${valor.toLocaleString('es-GT', {
      maximumFractionDigits: 1
    })} ${unidades[indice]}`;
  }

  restablecerElemento(elemento: Elemento): void {
    const operacion = elemento.tipo === 'carpeta'
      ? this.carpetasService.restaurar(elemento.id)
      : this.archivosService.restaurar(elemento.id)

    operacion.subscribe({
      next: (respuesta) => {
        console.log(respuesta.mensaje)
        this.menuElementoId = null
        this.cargarElementos()
      },
      error: (error) => {
        console.error('Error al restaurar el elemento:', error)
        alert(error.error?.mensaje ?? 'No se pudo restaurar el elemento.')
      }
    })
  }

  eliminarDefinitivamente(elemento: Elemento): void {
    const confirmar = window.confirm(`¿Eliminar definitivamente "${elemento.nombre}"? Esta acción no se puede deshacer.`)

    if (!confirmar) {
      return
    }

    const operacion = elemento.tipo === 'carpeta'
      ? this.carpetasService.eliminarDefinitivamente(elemento.id)
      : this.archivosService.eliminarDefinitivamente(elemento.id)

    operacion.subscribe({
      next: (respuesta) => {
        console.log(respuesta.mensaje)
        this.menuElementoId = null
        this.cargarElementos()
      },
      error: (error) => {
        console.error('Error al eliminar definitivamente el elemento:', error);
        alert(error.error?.mensaje ?? 'No se pudo eliminar definitivamente el elemento.')
      }
    })
  }

  alCambiarBusqueda(valor: string): void {
    this.busqueda = valor

    if (!valor.trim() || this.vistaActual !== 'mis-carpetas' || this.elementosBusquedaGlobal !== null || this.busquedaGlobalCargando) {
      return
    }

    this.busquedaGlobalCargando = true
    this.cargando = true
    this.errorCarga = ''

    this.obtenerElementosRecursivos(null).pipe(
      finalize(() => {
        this.busquedaGlobalCargando = false
        this.cargando = false
        this.cdr.detectChanges()
      })
    ).subscribe({
      next: elementos => {
        this.elementosBusquedaGlobal = elementos
      },
      error: error => {
        console.error('Error en la búsqueda global:', error)
        this.errorCarga = error.error?.mensaje ?? 'No se pudieron buscar los documentos.'
        this.elementosBusquedaGlobal = null
      }
    })
  }

  private obtenerElementosRecursivos(carpetaPadreId: string | null): Observable<Elemento[]> {
    return forkJoin({
      carpetas: this.carpetasService.listar(carpetaPadreId),
      archivos: this.archivosService.listar(carpetaPadreId)
    }).pipe(
      switchMap(({ carpetas, archivos }) => {
        const carpetasActuales: Elemento[] = carpetas.map(carpeta => ({
          id: carpeta._id,
          nombre: carpeta.nombre,
          tipo: 'carpeta',
          carpetaPadreId: carpeta.carpetaPadreId,
          fechaModificacion: new Date(carpeta.fechaModificacion),
          enPapelera: false
        }))

        const archivosActuales: Elemento[] = archivos.map(archivo => ({
          id: archivo._id,
          nombre: archivo.nombre,
          tipo: 'archivo',
          extension: archivo.extension.replace(/^\./, '') as ExtensionArchivo,
          carpetaPadreId: archivo.carpetaId,
          fechaModificacion: new Date(archivo.fechaModificacion),
          enPapelera: false
        }))

        if (carpetas.length === 0) {
          return of([...carpetasActuales, ...archivosActuales])
        }

        const consultasSubcarpetas = carpetas.map(carpeta => this.obtenerElementosRecursivos(carpeta._id))

        return forkJoin(consultasSubcarpetas).pipe(
          map(resultadosSubcarpetas => [
            ...carpetasActuales,
            ...archivosActuales,
            ...resultadosSubcarpetas.flat()
          ])
        )
      })
    )
  }

  private existeElemento(
    nombre: string,
    excluirId?: string
  ): boolean {
    return this.existeElementoEnCarpeta(
      nombre,
      this.carpetaActualId,
      excluirId
    );
  }

  private existeElementoEnCarpeta(nombre: string, carpetaId: string | null, excluirId?: string): boolean {
    const nombreNormalizado = nombre.toLocaleLowerCase();

    return this.elementos.some(elemento =>
      elemento.id !== excluirId &&
      !elemento.enPapelera &&
      elemento.carpetaPadreId === carpetaId &&
      this.nombreCompleto(elemento).toLocaleLowerCase() === nombreNormalizado
    )
  }

  private esDescendiente(posibleDescendienteId: string, ancestroId: string): boolean {
    let idActual: string | null = posibleDescendienteId;

    while (idActual !== null) {
      const actual = this.elementos.find(
        elemento => elemento.id === idActual
      );

      if (!actual) {
        return false;
      }

      if (actual.carpetaPadreId === ancestroId) {
        return true;
      }
      idActual = actual.carpetaPadreId;
    }
    return false;
  }

  private obtenerRutaCarpeta(id: string): string {
    const partes: string[] = [];
    let idActual: string | null = id;

    while (idActual !== null) {
      const carpeta = this.elementos.find(
        elemento => elemento.id === idActual
      );

      if (!carpeta) {
        break;
      }
      partes.unshift(carpeta.nombre);
      idActual = carpeta.carpetaPadreId;
    }
    return `Mi unidad / ${partes.join(' / ')}`;
  }

  private obtenerContenidoCarpeta(id: string): unknown {
    const carpeta = this.elementos.find(elemento => elemento.id === id);

    if (!carpeta) {
      return null;
    }

    return {
      nombre: carpeta.nombre,
      tipo: 'carpeta',
      elementos: this.elementos
        .filter(elemento =>
          elemento.carpetaPadreId === id && !elemento.enPapelera
        )
        .map(elemento =>
          elemento.tipo === 'carpeta'
            ? this.obtenerContenidoCarpeta(elemento.id)
            : {
              nombre: this.nombreCompleto(elemento),
              tipo: 'archivo',
              fechaModificacion: elemento.fechaModificacion
            }
        )
    };
  }

  private descargarBlob(
    contenido: string,
    nombre: string,
    tipo: string
  ): void {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');

    enlace.href = url;
    enlace.download = nombre;
    enlace.click();

    URL.revokeObjectURL(url);
  }

  private cerrarMenuElemento(): void {
    this.menuElementoId = null;
  }

  private generarId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  irACompartidos(): void {
    this.vistaActual = 'compartidos'
    this.carpetaActualId = null
    this.busqueda = ''
    this.menuElementoId = null
    this.menuNuevoAbierto = false
    this.cargarElementos()
  }

  irAPapelera(): void {
    this.vistaActual = 'papelera';
    this.carpetaActualId = null;
    this.busqueda = '';
    this.menuElementoId = null;
    this.menuNuevoAbierto = false;
    this.cargarElementos();
  }

  irARaiz(): void {
    this.vistaActual = 'mis-carpetas'
    this.carpetaActualId = null
    this.busqueda = ''
    this.menuNuevoAbierto = false
    this.menuElementoId = null
    this.cargarElementos()
  }
}
