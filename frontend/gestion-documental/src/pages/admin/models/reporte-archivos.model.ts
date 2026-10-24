import { ArchivoPorExtension } from "./archivo-por-extension.model";
import { ResumenEstadoArchivo } from "./resumen-estado-archivo.model";
import { UsuarioConArchivos } from "./usuario-con-archivos";

export interface ReporteArchivos {
  filtros: {
    fechaInicio: string | null;
    fechaFin: string | null;
  };
  archivos: {
    total: number;
    tamanoTotal: number;
    porEstado: Record<string, ResumenEstadoArchivo>;
    porExtension: ArchivoPorExtension[];
    principalesUsuarios: UsuarioConArchivos[];
  };
  almacenamiento: {
    totalUsuarios: number;
    capacidadTotal: number;
    utilizadoTotal: number;
    disponibleTotal: number;
  };
}
