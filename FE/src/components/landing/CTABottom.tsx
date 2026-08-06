import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const CTABottom = () => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    toast.success('Đăng ký thành công! Chúng tôi sẽ liên hệ sớm.');
    setEmail('');
  };

  return (
    <section className="relative z-10 max-w-4xl mx-auto px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative rounded-2xl p-8 md:p-12 text-center overflow-hidden bg-card/80 backdrop-blur-xl border border-border shadow-lg"
      >
        {/* Glow blobs */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-[#00d4aa]/10 rounded-full blur-[80px]" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#0ea5e9]/10 rounded-full blur-[80px]" />

        <div className="relative z-10">
          <span className="text-xs font-body font-medium text-[#00d4aa] tracking-widest uppercase mb-3 block">Bắt đầu hôm nay</span>
          <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-foreground tracking-[-1px] leading-tight mb-4">
            Phổi của bạn<br />xứng đáng được bảo vệ
          </h2>
          <p className="text-sm font-body text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
            Hàng triệu người đang hít thở không khí ô nhiễm mà không biết.<br />Hãy là người đầu tiên hành động thông minh hơn.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-4">
            <Input
              type="email"
              placeholder="Nhập email của bạn..."
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground font-body"
            />
            <Button type="submit" className="font-heading font-semibold bg-gradient-to-r from-[#00d4aa] to-[#0ea5e9] hover:opacity-90 text-white border-0 shadow-[0_0_20px_rgba(0,212,170,0.3)] shrink-0 px-6">
              Đăng ký ngay
            </Button>
          </form>
          <p className="text-[10px] font-body text-muted-foreground/50">Miễn phí · Không cần thẻ tín dụng · Hủy bất kỳ lúc nào</p>
        </div>
      </motion.div>
    </section>
  );
};

export default CTABottom;
