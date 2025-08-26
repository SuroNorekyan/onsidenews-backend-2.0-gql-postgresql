import axios, { AxiosInstance } from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProviderSnapshot } from '../provider-cache/entities/provider-snapshot.entity';
import { env, ensureProviderKeyPresent } from '../common/env';
import { hashParams } from '../common/util/hashParams';
import * as fs from 'fs';
import * as path from 'path';

type TTLSeconds = number;

const DEFAULT_TTL: TTLSeconds = 15 * 60; // 15 minutes

const TTL_BY_ENDPOINT: Record<string, TTLSeconds> = {
  leagues: 24 * 60 * 60,
  teams: 6 * 60 * 60,
  players: 6 * 60 * 60,
  'teams/statistics': 6 * 60 * 60,
  fixtures: 60 * 60,
  'fixtures/events': 30 * 60,
  'fixtures/lineups': 30 * 60,
};

@Injectable()
export class ApiFootballClient {
  private readonly logger = new Logger(ApiFootballClient.name);
  private readonly http: AxiosInstance;

  constructor(
    @InjectRepository(ProviderSnapshot)
    private readonly snapshots: Repository<ProviderSnapshot>,
  ) {
    this.http = axios.create({
      baseURL: env.apiFootballBase,
      timeout: 15_000,
      headers: {
        'x-apisports-key': env.apiFootballKey || 'SAFE_MODE',
      },
    });
  }

  private ttlFor(endpoint: string): TTLSeconds {
    return TTL_BY_ENDPOINT[endpoint] ?? DEFAULT_TTL;
  }

  private samplePath(sampleName: string): string {
    return path.join(process.cwd(), 'samples', sampleName);
  }

  private tryLoadSample(sampleName?: string): any | undefined {
    if (!sampleName) return undefined;
    try {
      const p = this.samplePath(sampleName);
      const txt = fs.readFileSync(p, 'utf8');
      return JSON.parse(txt);
    } catch {
      return undefined;
    }
  }

  async get(
    endpoint: string,
    params: Record<string, any>,
    options?: { sampleName?: string; overrideTtlSeconds?: number },
  ): Promise<any> {
    const ttl = options?.overrideTtlSeconds ?? this.ttlFor(endpoint);
    const paramsHash = hashParams({ endpoint, params });

    // 1) Check snapshot cache
    const now = new Date();
    const cached = await this.snapshots.findOne({
      where: {
        provider: 'apifootball',
        endpoint,
        paramsHash,
      },
      order: { createdAt: 'DESC' },
    });

    if (cached && cached.expiresAt > now) {
      return cached.body;
    }

    // 2) SAFE_MODE: only serve samples or throw
    if (env.safeMode) {
      const sample = this.tryLoadSample(options?.sampleName);
      if (sample) return sample;
      throw new Error(
        `SAFE_MODE enabled and no sample for ${endpoint}. Provide samples/${options?.sampleName || 'N/A'} or disable SAFE_MODE.`,
      );
    }

    // 3) If snapshot is missing or stale and samples allowed, try sample
    if (env.useSamplesWhenMissing) {
      const sample = this.tryLoadSample(options?.sampleName);
      if (sample) return sample;
    }

    // 4) Live call (SAFE_MODE=false)
    ensureProviderKeyPresent();
    if (env.logProviderCalls) {
      this.logger.log(`LIVE CALL -> ${endpoint} ${JSON.stringify(params)}`);
    }

    const res = await this.http.get(`/${endpoint}`, { params });
    const body = res.data;

    // 5) Persist snapshot
    const snapshot = this.snapshots.create({
      provider: 'apifootball',
      endpoint,
      paramsHash,
      body,
      expiresAt: new Date(Date.now() + ttl * 1000),
    });
    await this.snapshots.save(snapshot);

    return body;
  }
}

