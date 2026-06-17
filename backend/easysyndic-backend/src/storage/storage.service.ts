import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

type UploadedFile = {
  originalname?: string;
  mimetype?: string;
  size?: number;
  buffer?: Buffer;
};

@Injectable()
export class StorageService {
  private readonly supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
  private readonly serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  isConfigured() {
    return Boolean(this.supabaseUrl && this.serviceRoleKey);
  }

  validateFile(
    file: UploadedFile | undefined,
    options: {
      allowedMimeTypes: Set<string>;
      maxSize: number;
      label: string;
    },
  ): asserts file is UploadedFile & { buffer: Buffer } {
    if (!file?.buffer) {
      throw new BadRequestException(`${options.label} file is required`);
    }

    const mimetype = file.mimetype ?? 'application/octet-stream';
    if (!options.allowedMimeTypes.has(mimetype)) {
      throw new BadRequestException(`Type de fichier non autorise: ${mimetype}`);
    }

    if ((file.size ?? file.buffer.length) > options.maxSize) {
      throw new BadRequestException('Fichier trop volumineux');
    }
  }

  async uploadPrivateFile(
    bucket: string,
    path: string,
    file: UploadedFile & { buffer: Buffer },
  ) {
    this.assertConfigured();

    const response = await fetch(
      `${this.supabaseUrl}/storage/v1/object/${bucket}/${encodeURI(path)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.serviceRoleKey}`,
          apikey: this.serviceRoleKey!,
          'Content-Type': file.mimetype ?? 'application/octet-stream',
          'x-upsert': 'true',
        },
        body: file.buffer as unknown as BodyInit,
      },
    );

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw new ServiceUnavailableException(
        `Upload Supabase impossible${details ? `: ${details}` : ''}`,
      );
    }

    return path;
  }

  async createSignedUrl(bucket: string, path: string, expiresIn = 60 * 10) {
    this.assertConfigured();

    const response = await fetch(
      `${this.supabaseUrl}/storage/v1/object/sign/${bucket}/${encodeURI(path)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.serviceRoleKey}`,
          apikey: this.serviceRoleKey!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn }),
      },
    );

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw new ServiceUnavailableException(
        `Lien signe indisponible${details ? `: ${details}` : ''}`,
      );
    }

    const payload = (await response.json()) as { signedURL?: string; signedUrl?: string };
    const signedPath = payload.signedURL ?? payload.signedUrl;
    if (!signedPath) {
      throw new ServiceUnavailableException('Lien signe Supabase invalide');
    }

    return signedPath.startsWith('http')
      ? signedPath
      : `${this.supabaseUrl}/storage/v1${signedPath}`;
  }

  buildPath(parts: string[], fileName?: string) {
    const safeName = this.sanitizeFileName(fileName || 'file');
    return [...parts, `${Date.now()}-${safeName}`].join('/');
  }

  private assertConfigured() {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Supabase Storage is not configured on the backend',
      );
    }
  }

  private sanitizeFileName(fileName: string) {
    return fileName
      .normalize('NFKD')
      .replace(/[^\w.-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
  }
}
