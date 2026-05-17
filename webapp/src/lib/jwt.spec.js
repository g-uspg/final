const jwt = require('jsonwebtoken');

// Cargar jwt lib con secrets de test ya seteados en jest.setup.js
const { signAccess, signRefresh, verifyAccess, verifyRefresh, getUserFromRequest } = require('./jwt');

const PAYLOAD = { sub: 'user-123', email: 'test@uspg.edu.gt', role: 'STUDENT' };

describe('jwt.js', () => {
  describe('signAccess', () => {
    it('genera token con el payload correcto', () => {
      const token = signAccess(PAYLOAD);
      const decoded = jwt.decode(token);
      expect(decoded.sub).toBe(PAYLOAD.sub);
      expect(decoded.email).toBe(PAYLOAD.email);
      expect(decoded.role).toBe(PAYLOAD.role);
    });

    it('genera token que expira en 1 hora', () => {
      const token = signAccess(PAYLOAD);
      const decoded = jwt.decode(token);
      const diffSeconds = decoded.exp - decoded.iat;
      expect(diffSeconds).toBe(3600);
    });
  });

  describe('signRefresh', () => {
    it('genera token con el payload correcto', () => {
      const token = signRefresh(PAYLOAD);
      const decoded = jwt.decode(token);
      expect(decoded.sub).toBe(PAYLOAD.sub);
    });

    it('genera token que expira en 7 días', () => {
      const token = signRefresh(PAYLOAD);
      const decoded = jwt.decode(token);
      const diffSeconds = decoded.exp - decoded.iat;
      expect(diffSeconds).toBe(7 * 24 * 3600);
    });
  });

  describe('verifyAccess', () => {
    it('retorna payload con token válido', () => {
      const token = signAccess(PAYLOAD);
      const decoded = verifyAccess(token);
      expect(decoded.sub).toBe(PAYLOAD.sub);
      expect(decoded.email).toBe(PAYLOAD.email);
    });

    it('lanza error con token expirado', () => {
      const expired = jwt.sign(PAYLOAD, process.env.JWT_SECRET, { expiresIn: '-1s' });
      expect(() => verifyAccess(expired)).toThrow(/expired/i);
    });

    it('lanza error con token firmado con secret incorrecto', () => {
      const bad = jwt.sign(PAYLOAD, 'wrong_secret');
      expect(() => verifyAccess(bad)).toThrow(/invalid signature/i);
    });

    it('lanza error con token malformado', () => {
      expect(() => verifyAccess('not.a.jwt')).toThrow();
    });
  });

  describe('verifyRefresh', () => {
    it('retorna payload con refresh token válido', () => {
      const token = signRefresh(PAYLOAD);
      const decoded = verifyRefresh(token);
      expect(decoded.sub).toBe(PAYLOAD.sub);
    });

    it('lanza error con refresh token firmado con secret incorrecto', () => {
      const bad = jwt.sign(PAYLOAD, 'wrong_secret');
      expect(() => verifyRefresh(bad)).toThrow(/invalid signature/i);
    });
  });

  describe('getUserFromRequest', () => {
    it('extrae y verifica token del header Authorization Bearer', () => {
      const token = signAccess(PAYLOAD);
      const request = { headers: { get: (h) => h === 'authorization' ? `Bearer ${token}` : null } };
      const user = getUserFromRequest(request);
      expect(user.sub).toBe(PAYLOAD.sub);
      expect(user.role).toBe(PAYLOAD.role);
    });

    it('retorna null cuando no hay header Authorization', () => {
      const request = { headers: { get: () => null } };
      const user = getUserFromRequest(request);
      expect(user).toBeNull();
    });

    it('retorna null con token expirado en el header', () => {
      const expired = jwt.sign(PAYLOAD, process.env.JWT_SECRET, { expiresIn: '-1s' });
      const request = { headers: { get: (h) => h === 'authorization' ? `Bearer ${expired}` : null } };
      const user = getUserFromRequest(request);
      expect(user).toBeNull();
    });

    it('retorna null con token inválido en el header', () => {
      const request = { headers: { get: (h) => h === 'authorization' ? 'Bearer bad.token.here' : null } };
      const user = getUserFromRequest(request);
      expect(user).toBeNull();
    });
  });
});
