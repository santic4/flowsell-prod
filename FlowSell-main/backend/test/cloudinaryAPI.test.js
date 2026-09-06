import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

process.env.CLOUDINARY_CLOUD_NAME = 'flowsell-test';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';
process.env.CLOUDINARY_FOLDER = 'flowsell/templates';

const {
  deleteTemplateImages,
  extractCloudinaryPublicId,
  uploadTemplateImages,
} = await import('../src/integrations/Cloudinary/cloudinaryAPI.js');

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('extrae el public ID solo de URLs pertenecientes al cloud configurado', () => {
  const validUrl = 'https://res.cloudinary.com/flowsell-test/image/upload/q_auto/v123456/flowsell/templates/user-1/photo.webp';

  assert.equal(
    extractCloudinaryPublicId(validUrl),
    'flowsell/templates/user-1/photo',
  );
  assert.equal(
    extractCloudinaryPublicId('https://res.cloudinary.com/otro-cloud/image/upload/v1/photo.jpg'),
    null,
  );
  assert.equal(extractCloudinaryPublicId('https://example.com/photo.jpg'), null);
});

test('sube buffers mediante la API autenticada y devuelve URLs seguras', async () => {
  let capturedRequest;
  globalThis.fetch = async (url, options) => {
    capturedRequest = { url, options };
    return new Response(JSON.stringify({
      secure_url: 'https://res.cloudinary.com/flowsell-test/image/upload/v1/flowsell/templates/user-1/photo.jpg',
      public_id: 'flowsell/templates/user-1/photo',
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const urls = await uploadTemplateImages({
    'images-posventa': [{
      mimetype: 'image/jpeg',
      buffer: Buffer.from('fake-image'),
    }],
  }, 'user-1');

  assert.deepEqual(urls, [
    'https://res.cloudinary.com/flowsell-test/image/upload/v1/flowsell/templates/user-1/photo.jpg',
  ]);
  assert.equal(capturedRequest.url, 'https://api.cloudinary.com/v1_1/flowsell-test/image/upload');
  assert.equal(capturedRequest.options.method, 'POST');
  assert.match(capturedRequest.options.headers.Authorization, /^Basic /);
  assert.match(
    capturedRequest.options.body.get('public_id'),
    /^flowsell\/templates\/user-1\/[0-9a-f-]{36}$/,
  );
  assert.equal(capturedRequest.options.body.get('allowed_formats'), 'jpg,png,webp');
});

test('elimina por public ID, ignora URLs externas y evita duplicados', async () => {
  let capturedRequest;
  globalThis.fetch = async (url, options) => {
    capturedRequest = { url, options };
    return new Response(JSON.stringify({ deleted: { 'flowsell/templates/user-1/photo': 'deleted' } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const cloudinaryUrl = 'https://res.cloudinary.com/flowsell-test/image/upload/v1/flowsell/templates/user-1/photo.png';
  await deleteTemplateImages([
    cloudinaryUrl,
    cloudinaryUrl,
    'https://example.com/legacy-image.png',
  ]);

  const requestUrl = new URL(capturedRequest.url);
  assert.equal(capturedRequest.options.method, 'DELETE');
  assert.deepEqual(
    requestUrl.searchParams.getAll('public_ids[]'),
    ['flowsell/templates/user-1/photo'],
  );
  assert.equal(requestUrl.searchParams.get('invalidate'), 'true');
});
