export type RolUsuario = 'admin' | 'vendedor';

export interface UsuarioPublico {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  creado_en: Date;
}

export interface UsuarioAutenticado {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
}

export interface CredencialesUsuario {
  nombre: string;
  email: string;
  password: string;
}

export interface UsuarioConHash extends UsuarioPublico {
  password_hash: string;
}
