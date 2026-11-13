import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import {
  crearUsuarioAdminSchema,
  loginSchema,
  registroSchema
} from '../utils/auth-schemas';
import { validate } from '../utils/validation';

export async function registrar(request: Request, response: Response): Promise<void> {
  const input = validate(registroSchema, request.body);
  const usuario = await authService.registrar(input);
  response.status(201).json({ mensaje: 'Usuario registrado correctamente.', usuario });
}

export async function iniciarSesion(request: Request, response: Response): Promise<void> {
  const input = validate(loginSchema, request.body);
  const resultado = await authService.iniciarSesion(input.email, input.password);
  response.status(200).json(resultado);
}

export async function obtenerUsuario(request: Request, response: Response): Promise<void> {
  const usuarioAutenticado = request.usuario;
  if (!usuarioAutenticado) {
    response.status(401).json({ error: 'Se requiere autenticación.' });
    return;
  }

  const usuario = await authService.obtenerUsuarioAutenticado(usuarioAutenticado.id);
  response.status(200).json({ usuario });
}

export async function crearUsuario(request: Request, response: Response): Promise<void> {
  const input = validate(crearUsuarioAdminSchema, request.body);
  const { rol, ...credenciales } = input;
  const usuario = await authService.crearUsuario(credenciales, rol);
  response.status(201).json({ mensaje: 'Usuario creado correctamente.', usuario });
}
