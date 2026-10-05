// CU-70: catálogo codificado de tipos de trabajo (T-01..T-10) con los campos que
// precompletan el cierre. Es una constante y no una tabla: los 10 códigos vienen
// fijos en la especificación (Tabla 7.89), no se administran desde la aplicación y
// no tienen dueño que los edite. Si algún día G3 publica su propio catálogo
// (doc-12 §1.2, `GET /ordenes/categorias-falla`), se mapea contra estos códigos.

export interface CamposCierre {
  falla_reportada?: string;
  solucion_aplicada?: string;
  // Literales del CU-69: 'RESUELTO' | 'PARCIAL' | 'SIN_SOLUCION'
  resultado?: string;
  categoria_falla?: string;
}

export interface TipoTrabajo {
  codigo: string;
  nombre: string;
  // A qué cierre aplica cada código (el select del técnico filtra por la OT).
  tipo_ot: 'INSTALACION' | 'REPARACION' | 'AMBOS';
  campos: CamposCierre;
  // Nombres de consumibles que suele llevar el trabajo; el técnico ajusta las
  // cantidades reales (el descuento lo hace CU-64/CU-68 con el cierre de G3).
  materiales_sugeridos: string[];
}

export const TIPOS_TRABAJO: TipoTrabajo[] = [
  {
    codigo: 'T-01',
    nombre: 'Instalación internet',
    tipo_ot: 'INSTALACION',
    campos: {
      solucion_aplicada:
        'Instalación de servicio de internet: tendido de fibra, instalación de ONT y prueba de navegación.',
    },
    materiales_sugeridos: ['Fibra drop', 'Conector SC/APC', 'Roseta óptica'],
  },
  {
    codigo: 'T-02',
    nombre: 'TV cable',
    tipo_ot: 'INSTALACION',
    campos: {
      solucion_aplicada:
        'Instalación de servicio de TV cable: tendido de coaxial, instalación de decodificador y prueba de señal.',
    },
    materiales_sugeridos: ['Cable coaxial RG6', 'Conector coaxial', 'Splitter'],
  },
  {
    codigo: 'T-03',
    nombre: 'Combo',
    tipo_ot: 'INSTALACION',
    campos: {
      solucion_aplicada:
        'Instalación de combo internet + TV cable: ONT y decodificador instalados, ambos servicios probados.',
    },
    materiales_sugeridos: [
      'Fibra drop',
      'Cable coaxial RG6',
      'Conector SC/APC',
      'Splitter',
    ],
  },
  {
    codigo: 'T-04',
    nombre: 'Cambio ONT',
    tipo_ot: 'REPARACION',
    campos: {
      falla_reportada: 'El cliente reporta que la ONT no entrega servicio.',
      solucion_aplicada:
        'Se reemplazó la ONT por una unidad operativa y se verificó la navegación del cliente.',
      resultado: 'RESUELTO',
      categoria_falla: 'Equipo defectuoso',
    },
    materiales_sugeridos: ['Patchcord SC/APC'],
  },
  {
    codigo: 'T-05',
    nombre: 'Cambio decodificador',
    tipo_ot: 'REPARACION',
    campos: {
      falla_reportada: 'El cliente reporta que el decodificador no muestra señal.',
      solucion_aplicada:
        'Se reemplazó el decodificador por una unidad operativa y se verificó la señal de TV.',
      resultado: 'RESUELTO',
      categoria_falla: 'Equipo defectuoso',
    },
    materiales_sugeridos: ['Cable HDMI'],
  },
  {
    codigo: 'T-06',
    nombre: 'Reparación fibra',
    tipo_ot: 'REPARACION',
    campos: {
      falla_reportada:
        'El cliente reporta pérdida total del servicio por corte de la fibra de acometida.',
      solucion_aplicada:
        'Se reparó el tramo de fibra dañado, se hizo el empalme y se midió la potencia óptica.',
      resultado: 'RESUELTO',
      categoria_falla: 'Corte de fibra',
    },
    materiales_sugeridos: ['Fibra drop', 'Conector SC/APC', 'Manga de empalme'],
  },
  {
    codigo: 'T-07',
    nombre: 'Reparación TV',
    tipo_ot: 'REPARACION',
    campos: {
      falla_reportada:
        'El cliente reporta canales con interferencia o ausencia de señal de TV.',
      solucion_aplicada:
        'Se revisó la red coaxial, se reemplazaron conectores dañados y se verificó la señal en el decodificador.',
      resultado: 'RESUELTO',
      categoria_falla: 'Señal degradada',
    },
    materiales_sugeridos: ['Cable coaxial RG6', 'Conector coaxial'],
  },
  {
    codigo: 'T-08',
    nombre: 'Cambio splitter',
    tipo_ot: 'REPARACION',
    campos: {
      falla_reportada:
        'El cliente reporta señal intermitente en uno o más puntos del domicilio.',
      solucion_aplicada:
        'Se reemplazó el splitter defectuoso y se verificó el nivel de señal en cada salida.',
      resultado: 'RESUELTO',
      categoria_falla: 'Equipo defectuoso',
    },
    materiales_sugeridos: ['Splitter', 'Conector coaxial'],
  },
  {
    codigo: 'T-09',
    nombre: 'Reconfiguración',
    tipo_ot: 'REPARACION',
    campos: {
      falla_reportada:
        'El cliente reporta problemas de conexión sin daño visible en la instalación.',
      solucion_aplicada:
        'Se reconfiguró el equipo del cliente (parámetros de red y credenciales) y se probó el servicio.',
      resultado: 'RESUELTO',
      categoria_falla: 'Configuración',
    },
    materiales_sugeridos: [],
  },
  {
    codigo: 'T-10',
    nombre: 'Retiro por baja',
    tipo_ot: 'AMBOS',
    campos: {
      falla_reportada:
        'Baja del servicio: se solicita el retiro de los equipos del domicilio.',
      solucion_aplicada:
        'Se retiraron los equipos del cliente y se dejaron en poder del técnico para su reingreso a bodega.',
      resultado: 'RESUELTO',
      categoria_falla: 'Baja de servicio',
    },
    materiales_sugeridos: [],
  },
];

export function buscarTipoTrabajo(codigo: string): TipoTrabajo | null {
  const buscado = (codigo ?? '').trim().toUpperCase();
  return TIPOS_TRABAJO.find((tipo) => tipo.codigo === buscado) ?? null;
}
