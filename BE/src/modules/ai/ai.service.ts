import { Injectable, ServiceUnavailableException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { fetchJson } from '../../common/cache.util';
import { ChatDto, InsightDto } from './dto/ai.dto';

/**
 * Thay 2 edge function ai-chat và ai-insight.
 * Mặc định dùng Anthropic; có thể đổi sang OpenAI/Gemini qua AI_PROVIDER.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private anthropic?: Anthropic;

  constructor(private readonly config: ConfigService) {}

  private get provider() {
    return (this.config.get<string>('AI_PROVIDER') ?? 'anthropic').toLowerCase();
  }

  private getAnthropic(): Anthropic {
    if (!this.anthropic) {
      const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
      if (!apiKey) {
        throw new ServiceUnavailableException(
          'Chưa cấu hình ANTHROPIC_API_KEY trong .env',
        );
      }
      this.anthropic = new Anthropic({ apiKey });
    }
    return this.anthropic;
  }

  // ---------- prompt ----------

  private guardrails(isVi: boolean) {
    return isVi
      ? 'QUY TẮC: KHÔNG chẩn đoán bệnh. KHÔNG kê đơn thuốc. KHÔNG khẳng định tình trạng khẩn cấp. Nếu người dùng mô tả triệu chứng nghiêm trọng, hãy khuyên họ mở AirWeave SOS / Medical ID hoặc gọi 115. Đưa ra hướng dẫn thận trọng, gợi ý giảm tiếp xúc, gợi ý lộ trình PM2.5 thấp hơn nếu có.'
      : 'RULES: DO NOT diagnose disease. DO NOT prescribe medication. DO NOT claim emergency certainty. If the user describes severe symptoms, advise them to open AirWeave SOS / Medical ID or call 115. Give cautious non-diagnostic guidance, suggest reducing exposure, and suggest a lower-PM2.5 route if available.';
  }

  private chatSystemPrompt(dto: ChatDto) {
    const isVi = dto.lang !== 'en';
    const c = dto.context;

    const contextInfo = c
      ? `\nDữ liệu hiện tại: Vị trí: ${c.location ?? 'N/A'}, AQI: ${c.aqi ?? 'N/A'}, PM2.5: ${c.pm25 ?? 'N/A'} µg/m³, Nhiệt độ: ${c.temperature ?? 'N/A'}°C, Độ ẩm: ${c.humidity ?? 'N/A'}%`
      : '';

    const riskInfo = c?.riskGroup
      ? isVi
        ? `\nHồ sơ rủi ro của người dùng: ${c.riskGroup}.`
        : `\nUser risk profile: ${c.riskGroup}.`
      : '';

    return isVi
      ? `Bạn là AirWeave AI - trợ lý về chất lượng không khí và sức khỏe hô hấp tại Việt Nam. Trả lời ngắn gọn (2-4 câu), thân thiện, có emoji. Luôn đưa gợi ý hành động cụ thể. ${this.guardrails(true)}${contextInfo}${riskInfo}`
      : `You are AirWeave AI - an air quality and respiratory health assistant in Vietnam. Reply concisely (2-4 sentences), friendly, with emojis. Always give specific action tips. ${this.guardrails(false)}${contextInfo}${riskInfo}`;
  }

  private insightPrompts(dto: InsightDto) {
    const isVi = dto.lang !== 'en';
    const w = dto.weather ?? {};
    const p = dto.preferences ?? {};

    const system = isVi
      ? `Bạn là trợ lý AI về chất lượng không khí và sức khỏe môi trường tại Việt Nam. Phân tích ngắn gọn (3-4 câu), dùng emoji. Gợi ý 1 hành động cụ thể. ${this.guardrails(true)}`
      : `You are an AI assistant for air quality and environmental health in Vietnam. Provide brief analysis (3-4 sentences) with emojis and 1 specific action. ${this.guardrails(false)}`;

    const user = isVi
      ? `Phân tích tình hình không khí hiện tại:
- Vị trí: ${dto.location?.label ?? 'Không xác định'}
- AQI: ${w.aqi ?? 'N/A'}
- PM2.5: ${w.pm25 ?? 'N/A'} µg/m³
- Nhiệt độ: ${w.temperature ?? 'N/A'}°C
- Độ ẩm: ${w.humidity ?? 'N/A'}%
- Gió: ${w.windSpeed ?? 'N/A'} km/h, hướng ${w.windDirection ?? 'N/A'}
${p.health_tier?.length ? `- Nhóm sức khỏe: ${p.health_tier.join(', ')}` : ''}
${p.commute_type?.length ? `- Phương tiện di chuyển: ${p.commute_type.join(', ')}` : ''}
${p.sensitive_group && p.sensitive_group !== 'none' ? `- Nhóm nhạy cảm: ${p.sensitive_group}` : ''}
${p.high_exposure ? '- Người dùng thường xuyên tiếp xúc ngoài trời' : ''}

Hãy đưa ra phân tích ngắn gọn và gợi ý hành động phù hợp.`
      : `Analyze current air conditions:
- Location: ${dto.location?.label ?? 'Unknown'}
- AQI: ${w.aqi ?? 'N/A'}
- PM2.5: ${w.pm25 ?? 'N/A'} µg/m³
- Temperature: ${w.temperature ?? 'N/A'}°C
- Humidity: ${w.humidity ?? 'N/A'}%
- Wind: ${w.windSpeed ?? 'N/A'} km/h, direction ${w.windDirection ?? 'N/A'}
${p.health_tier?.length ? `- Health group: ${p.health_tier.join(', ')}` : ''}
${p.commute_type?.length ? `- Commute type: ${p.commute_type.join(', ')}` : ''}
${p.sensitive_group && p.sensitive_group !== 'none' ? `- Sensitive group: ${p.sensitive_group}` : ''}
${p.high_exposure ? '- User has high outdoor exposure' : ''}

Provide a brief analysis and actionable recommendation.`;

    return { system, user };
  }

  // ---------- gọi model ----------

  /**
   * Câu trả lời ở đây đều ngắn (2-4 câu) nên không bật extended thinking
   * và giữ max_tokens thấp để tiết kiệm chi phí + giảm độ trễ.
   */
  private async completeWithAnthropic(
    system: string,
    messages: { role: 'user' | 'assistant'; content: string }[],
  ): Promise<string> {
    const model = this.config.get<string>('ANTHROPIC_MODEL') ?? 'claude-opus-4-8';

    const response = await this.getAnthropic().messages.create({
      model,
      max_tokens: 1024,
      system,
      messages,
    });

    return response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();
  }

  private async completeWithOpenAi(
    system: string,
    messages: { role: 'user' | 'assistant'; content: string }[],
  ): Promise<string> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) throw new ServiceUnavailableException('Chưa cấu hình OPENAI_API_KEY');

    const data = await fetchJson<any>(
      'https://api.openai.com/v1/chat/completions',
      30000,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini',
          max_tokens: 1024,
          messages: [{ role: 'system', content: system }, ...messages],
        }),
      },
    );
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }

  private async completeWithGemini(
    system: string,
    messages: { role: 'user' | 'assistant'; content: string }[],
  ): Promise<string> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) throw new ServiceUnavailableException('Chưa cấu hình GEMINI_API_KEY');

    const model = this.config.get<string>('GEMINI_MODEL') ?? 'gemini-2.0-flash';
    const data = await fetchJson<any>(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      30000,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: messages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
          generationConfig: { maxOutputTokens: 1024 },
        }),
      },
    );
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  }

  private complete(
    system: string,
    messages: { role: 'user' | 'assistant'; content: string }[],
  ): Promise<string> {
    switch (this.provider) {
      case 'openai':
        return this.completeWithOpenAi(system, messages);
      case 'gemini':
        return this.completeWithGemini(system, messages);
      case 'anthropic':
      default:
        return this.completeWithAnthropic(system, messages);
    }
  }

  // ---------- public ----------

  async chat(dto: ChatDto) {
    const history = dto.messages.slice(-12); // giới hạn ngữ cảnh gửi lên model
    const reply = await this.complete(this.chatSystemPrompt(dto), history);
    return { reply, provider: this.provider };
  }

  async insight(dto: InsightDto) {
    const { system, user } = this.insightPrompts(dto);
    const insight = await this.complete(system, [{ role: 'user', content: user }]);
    return { insight, provider: this.provider };
  }
}
