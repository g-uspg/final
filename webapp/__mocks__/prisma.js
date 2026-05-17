const createModelMock = () => ({
  findMany:    jest.fn(),
  findUnique:  jest.fn(),
  findFirst:   jest.fn(),
  create:      jest.fn(),
  update:      jest.fn(),
  updateMany:  jest.fn(),
  delete:      jest.fn(),
  deleteMany:  jest.fn(),
  count:       jest.fn(),
  aggregate:   jest.fn(),
  groupBy:     jest.fn(),
  upsert:      jest.fn(),
});

const prismaMock = {
  user:           createModelMock(),
  vehicle:        createModelMock(),
  parkingSpace:   createModelMock(),
  parkingSession: createModelMock(),
  payment:        createModelMock(),
  reservation:    createModelMock(),
  notification:   createModelMock(),
  auditLog:       createModelMock(),
  blacklist:      createModelMock(),
  barrierLog:     createModelMock(),
  visitorQR:      createModelMock(),
  campus:         createModelMock(),
  camera:         createModelMock(),
  $transaction:   jest.fn((ops) => (Array.isArray(ops) ? Promise.all(ops) : ops(prismaMock))),
  $connect:       jest.fn(),
  $disconnect:    jest.fn(),
};

module.exports = prismaMock;
module.exports.default = prismaMock;
