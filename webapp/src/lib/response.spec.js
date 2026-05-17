const { ok, created, error, notFound, unauthorized, conflict } = require('./response');

async function parseResponse(response) {
  const text = await response.text();
  return JSON.parse(text);
}

describe('response.js', () => {
  describe('ok', () => {
    it('retorna status 200', () => {
      const r = ok({ id: '1' });
      expect(r.status).toBe(200);
    });

    it('retorna success: true', async () => {
      const body = await parseResponse(ok({ id: '1' }));
      expect(body.success).toBe(true);
    });

    it('retorna los datos pasados en data', async () => {
      const data = { id: '1', name: 'test' };
      const body = await parseResponse(ok(data));
      expect(body.data).toEqual(data);
    });

    it('retorna message personalizado', async () => {
      const body = await parseResponse(ok({}, 'Operación exitosa'));
      expect(body.message).toBe('Operación exitosa');
    });

    it('retorna message por defecto OK', async () => {
      const body = await parseResponse(ok({}));
      expect(body.message).toBe('OK');
    });
  });

  describe('created', () => {
    it('retorna status 201', () => {
      const r = created({ id: '1' });
      expect(r.status).toBe(201);
    });

    it('retorna success: true', async () => {
      const body = await parseResponse(created({ id: '1' }));
      expect(body.success).toBe(true);
    });

    it('incluye success, message y data', async () => {
      const body = await parseResponse(created({ id: '1' }, 'Creado correctamente'));
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('message', 'Creado correctamente');
      expect(body).toHaveProperty('data');
    });
  });

  describe('error', () => {
    it('retorna status 400 por defecto', () => {
      const r = error('Algo salió mal');
      expect(r.status).toBe(400);
    });

    it('retorna status personalizado', () => {
      const r = error('Error interno', 500);
      expect(r.status).toBe(500);
    });

    it('retorna success: false', async () => {
      const body = await parseResponse(error('fail'));
      expect(body.success).toBe(false);
    });

    it('retorna el mensaje de error', async () => {
      const body = await parseResponse(error('Datos inválidos'));
      expect(body.message).toBe('Datos inválidos');
    });
  });

  describe('notFound', () => {
    it('retorna status 404', () => {
      expect(notFound().status).toBe(404);
    });

    it('retorna success: false', async () => {
      const body = await parseResponse(notFound());
      expect(body.success).toBe(false);
    });

    it('retorna message personalizado', async () => {
      const body = await parseResponse(notFound('Recurso no encontrado'));
      expect(body.message).toBe('Recurso no encontrado');
    });
  });

  describe('unauthorized', () => {
    it('retorna status 401', () => {
      expect(unauthorized().status).toBe(401);
    });

    it('retorna success: false', async () => {
      const body = await parseResponse(unauthorized());
      expect(body.success).toBe(false);
    });

    it('incluye los campos success, message y data', async () => {
      const body = await parseResponse(unauthorized('Token expirado'));
      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('message');
    });
  });

  describe('conflict', () => {
    it('retorna status 409', () => {
      expect(conflict().status).toBe(409);
    });

    it('retorna success: false', async () => {
      const body = await parseResponse(conflict());
      expect(body.success).toBe(false);
    });

    it('retorna message de conflicto', async () => {
      const body = await parseResponse(conflict('Placa ya registrada'));
      expect(body.message).toBe('Placa ya registrada');
    });
  });
});
