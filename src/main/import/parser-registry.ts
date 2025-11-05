import { extname } from "node:path";
import type {
  AnnotationParser,
  FileParseRequest,
  FileParseResult,
  ParserSummary,
  SupportedFormat
} from "@shared/parser/types";
import { MockParser } from "./mock-parser";
import { JsonAnnotationParser } from "./json-parser";
import { GenBankAnnotationParser } from "./genbank-parser";
import { Gff3AnnotationParser } from "./gff3-parser";
import { CsvAnnotationParser } from "./csv-parser";

type ParserMap = Map<SupportedFormat, AnnotationParser>;

const EXTENSION_MAP: Record<string, SupportedFormat> = {
  ".gb": "genbank",
  ".gbk": "genbank",
  ".gff": "gff3",
  ".gff3": "gff3",
  ".json": "json",
  ".csv": "csv"
};

export class ParserRegistry {
  private readonly parsers: ParserMap = new Map();
  private readonly fallback: AnnotationParser;

  constructor(initialParsers: AnnotationParser[], fallback: AnnotationParser) {
    initialParsers.forEach((parser) => {
      const summary = parser.summary();
      this.parsers.set(summary.format, parser);
    });
    this.fallback = fallback;
  }

  summaries(): ParserSummary[] {
    return Array.from(this.parsers.values()).map((parser) => parser.summary());
  }

  async parse(request: FileParseRequest): Promise<FileParseResult> {
    const format = this.inferFormat(request);
    const parser = this.resolveParser(format);
    return parser.parse(request);
  }

  private inferFormat(request: FileParseRequest): SupportedFormat {
    if (request.formatHint) {
      return request.formatHint;
    }

    const extension = extname(request.filePath).toLowerCase();
    return EXTENSION_MAP[extension] ?? 'json';
  }

  private resolveParser(format: SupportedFormat): AnnotationParser {
    return this.parsers.get(format) ?? this.fallback;
  }
}

export const createDefaultParserRegistry = () =>
  new ParserRegistry(
    [
      new GenBankAnnotationParser(),
      new Gff3AnnotationParser(),
      new JsonAnnotationParser(),
      new CsvAnnotationParser()
    ],
    new MockParser()
  );
