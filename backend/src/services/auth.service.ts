import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import * as usuariosRepository from '../repositories/usuarios.repository';
import { CredencialesUsuario, RolUsuario, UsuarioPublico } from '../types/auth';
import { HttpError } from '../utils/http-error';

const saltRounds = 12;
const dummyPasswordHash = bcrypt.hash('nexusai-invalid-login-placeholder', saltRounds);

function tokenExpirySeconds(): number {
  const match = /^([1-9]\d*)(s|m|h|d)$/.exec(env.JWT_EXPIRES_IN);
  if (!match) {
    throw new Error('JWT_EXPIRES_IN tiene un formato no válido.');
  }

  const amount = Number(match[1]);
  const secondsPerUnit: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400
  };
  return amount * secondsPerUnit[match[2]];
}

export function crearToken(usuario: UsuarioPublico): string {
  const options: SignOptions = { expiresIn: tokenExpirySeconds() };
  return jwt.sign(
    { nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
    env.JWT_SECRET,
    { ...options, subject: usuario.id }
  );
}

export async function registrar(input: CredencialesUsuario): Promise<UsuarioPublico> {
  const { password, ...datosUsuario } = input;
  const passwordHash = await bcrypt.hash(input.password, saltRounds);
  return usuariosRepository.crearUsuario(datosUsuario, passwordHash, 'vendedor');
}

export async function crearUsuario(
  input: CredencialesUsuario,
  rol: RolUsuario
): Promise<UsuarioPublico> {
  const { password, ...datosUsuario } = input;
  const passwordHash = await bcrypt.hash(input.password, saltRounds);
  return usuariosRepository.crearUsuario(datosUsuario, passwordHash, rol);
}

export async function iniciarSesion(email: string, password: string): Promise<{
  token: string;
  usuario: UsuarioPublico;
}> {
  const usuario = await usuariosRepository.buscarUsuarioPorEmail(email);
  const hash = usuario ? usuario.password_hash : await dummyPasswordHash;
  const passwordValido = await bcrypt.compare(password, hash);

  if (!usuario || !passwordValido) {
    throw new HttpError(401, 'Credenciales inválidas');
  }

  const { password_hash: _passwordHash, ...usuarioPublico } = usuario;
  return {
    token: crearToken(usuarioPublico),
    usuario: usuarioPublico
  };
}

export async function obtenerUsuarioAutenticado(id: string): Promise<UsuarioPublico> {
  const usuario = await usuariosRepository.buscarUsuarioPorId(id);
  if (!usuario) {
    throw new HttpError(401, 'El usuario del token ya no existe.');
  }
  return usuario;
}
