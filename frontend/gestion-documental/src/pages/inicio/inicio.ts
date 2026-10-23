import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router'
import { forkJoin } from 'rxjs';

import { AuthService } from '../../services/auth';
import { CarpetasService } from '../../services/carpetas';
import { ArchivosService } from '../../services/archivos-service';
import { Elemento, ExtensionArchivo } from './models/elemento.model';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css'
})
export class Inicio implements OnInit {

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly carpetasService = inject(CarpetasService)
  private readonly archivosService = inject(ArchivosService)

  busqueda = '';
  menuNuevoAbierto = false;
  menuElementoId: string | null = null;
  carpetaActualId: string | null = null;
  vistaActual: 'mis-carpetas' | 'compartidos' | 'papelera' = 'mis-carpetas';

  // Datos de ejemplo. Después se cargarán desde el usuario autenticado.
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

    // Si estamos en la papelera, consultar las carpetas
    // cuyo estado en el backend es "papelera".
    if (this.vistaActual === 'papelera') {
      this.carpetasService.listarPapelera().subscribe({
        next: carpetas => {
          const carpetasPapelera: Elemento[] = carpetas.map(carpeta => ({
            id: carpeta._id,
            nombre: carpeta.nombre,
            tipo: 'carpeta',
            carpetaPadreId: carpeta.carpetaPadreId,
            fechaModificacion: new Date(carpeta.fechaModificacion),
            enPapelera: true
          }))

          const idsPapelera = new Set(carpetasPapelera.map(carpeta => carpeta.id))

          /*
          Actualizar las carpetas recuperadas del backend
          y eliminar las versiones anteriores de la papelera.
          */
          this.elementos = [
            ...this.elementos.filter(elemento =>
              !idsPapelera.has(elemento.id) && !(elemento.tipo === 'carpeta' && elemento.enPapelera)),
            ...carpetasPapelera
          ]
          this.cargando = false;
        },
        error: error => {
          console.error('Error al cargar la papelera:', error)
          this.errorCarga = 'No se pudieron cargar las carpetas de la papelera.'
          this.cargando = false
        }
      })
      return
    }

    // Cargar las carpetas y los archivos de la ubicación actual.
    forkJoin({
      carpetas: this.carpetasService.listar(this.carpetaActualId),
      archivos: this.archivosService.listar(this.carpetaActualId)
    }).subscribe({
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
          extension: archivo.extension.replace('.', '') as ExtensionArchivo,
          carpetaPadreId: archivo.carpetaId,
          fechaModificacion: new Date(archivo.fechaModificacion),
          enPapelera: false
        }));

        // Identificar los elementos que se recibieron del backend.
        const idsActuales = new Set([
          ...carpetasMapeadas.map(elemento => elemento.id),
          ...archivosMapeados.map(elemento => elemento.id)
        ])

        // Conservar en memoria los elementos de otras ubicaciones
        this.elementos = [
          ...this.elementos.filter(elemento =>
            !idsActuales.has(elemento.id) &&
            elemento.carpetaPadreId !== this.carpetaActualId
          ),
          ...carpetasMapeadas,
          ...archivosMapeados
        ]
        this.cargando = false
      },
      error: error => {
        console.error('Error al cargar los elementos:', error)
        this.errorCarga = 'No se pudieron cargar las carpetas y los archivos.'
        this.cargando = false
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
    const termino = this.busqueda.trim().toLocaleLowerCase();

    return this.elementos
      .filter(elemento => {
        if (this.vistaActual === 'papelera') {
          return elemento.enPapelera === true;
        }

        if (this.vistaActual === 'compartidos') {
          // Pendiente de conectar con el backend de comparticiones.
          return false;
        }

        return (elemento.carpetaPadreId === this.carpetaActualId && !elemento.enPapelera)
      })
      .filter(elemento => this.nombreCompleto(elemento).toLocaleLowerCase().includes(termino))
      .sort((a, b) => {
        if (a.tipo !== b.tipo) {
          return a.tipo === 'carpeta' ? -1 : 1;
        }

        return a.nombre.localeCompare(b.nombre);
      });
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
    this.menuNuevoAbierto = false;

    const nombre = window.prompt(
      `Nombre del archivo .${extension} (sin extensión):`
    );

    if (nombre === null) {
      return;
    }

    const nombreBase = nombre.trim().replace(/\.(md|txt)$/i, '').trim();

    if (!nombreBase) {
      window.alert('Debes ingresar un nombre válido.');
      return;
    }

    const nuevoArchivo: Elemento = {
      id: this.generarId(),
      nombre: nombreBase,
      tipo: 'archivo',
      extension,
      carpetaPadreId: this.carpetaActualId,
      fechaModificacion: new Date()
    };

    if (this.existeElemento(this.nombreCompleto(nuevoArchivo))) {
      window.alert('Ya existe un elemento con ese nombre en esta ubicación.');
      return;
    }

    this.elementos = [...this.elementos, nuevoArchivo];
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
    this.cerrarMenuElemento();

    if (elemento.tipo === 'carpeta') {
      const contenido = this.obtenerContenidoCarpeta(elemento.id);
      this.descargarBlob(
        JSON.stringify(contenido, null, 2),
        `${elemento.nombre}.json`,
        'application/json'
      );
      return;
    }

    const nombre = this.nombreCompleto(elemento);

    // Contenido de demostración: todavía no se recupera el contenido real
    // de los archivos desde MongoDB.
    const contenido =
      elemento.extension === 'md'
        ? `# ${elemento.nombre}\n\nDocumento de ejemplo.`
        : `Documento de ejemplo: ${elemento.nombre}`;

    this.descargarBlob(
      contenido,
      nombre,
      elemento.extension === 'md' ? 'text/markdown' : 'text/plain'
    );
  }

  compartirElemento(elemento: Elemento): void {
    this.cerrarMenuElemento();

    const correo = window.prompt(`Correo del usuario con quien deseas compartir "${elemento.nombre}":`)

    if (correo === null) {
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      window.alert('Ingresa una dirección de correo válida.');
      return;
    }

    window.alert(
      'La interfaz está preparada, pero el uso compartido real requiere ' +
      'conectar esta acción con el endpoint de comparticiones del backend.'
    )
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
    if (elemento.tipo !== 'carpeta') {
      return
    }
    this.carpetasService.restaurar(elemento.id).subscribe({
      next: (respuesta) => {
        console.log(respuesta.mensaje)
        this.menuElementoId = null
        this.cargarElementos()
      },
      error: (error) => {
        console.error('Error al restaurar la carpeta:', error)
        alert(error.error?.mensaje ?? 'No se pudo restaurar la carpeta.')
      }
    })
  }

  eliminarDefinitivamente(elemento: Elemento): void {
    if (elemento.tipo !== 'carpeta') {
      return
    }

    const confirmar = window.confirm(
      `¿Eliminar definitivamente la carpeta "${elemento.nombre}" y todo su contenido? Esta acción no se puede deshacer.`
    )

    if (!confirmar) {
      return
    }

    this.carpetasService.eliminarDefinitivamente(elemento.id).subscribe({
      next: (respuesta) => {
        console.log(respuesta.mensaje)
        this.menuElementoId = null
        this.cargarElementos()
      },
      error: (error) => {
        console.error('Error al eliminar definitivamente la carpeta:', error)
        alert(error.error?.mensaje ?? 'No se pudo eliminar definitivamente la carpeta.')
      }
    })
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
    this.vistaActual = 'compartidos';
    this.carpetaActualId = null;
    this.busqueda = '';
    this.menuElementoId = null;
    this.menuNuevoAbierto = false;
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
    this.vistaActual = 'mis-carpetas';
    this.carpetaActualId = null;
    this.busqueda = '';
    this.menuNuevoAbierto = false;
    this.menuElementoId = null;
  }
}
