export interface ListaProductosFiltros {
  categoria_id?: number;
  estado?: 'Disponible' | 'Agotado';
  busqueda?: string;
  page: number;
  limit: number;
}

export interface Paginacion {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}
