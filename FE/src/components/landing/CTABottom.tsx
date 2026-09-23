import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAppLang } from '@/hooks/use-app-lang';

const CTABottom = () => {
  const navigate = useNavigate();
  const lang = useAppLang();

  return (
    <section className="relative z-10 max-w-4xl mx-auto px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative rounded-2xl p-8 md:p-12 text-center overflow-hidden bg-card/80 backdrop-blur-xl border border-border shadow-lg"
      >
        <div className="absolute top-0 left-0 w-64 h-64 bg-[#00d4aa]/10 rounded-full blur-[80px]" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#0ea5e9]/10 rounded-full blur-[80px]" />
        <div className="relative z-10 space-y-5">
          <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-foreground">
            {lang === 'vi' ? 'Theo dõi chất lượng không khí quanh bạn' : 'Explore the air quality around you'}
          </h2>
          <p className="text-sm font-body text-muted-foreground max-w-md mx-auto">
            {lang === 'vi' ? 'Tạo tài khoản hoặc đăng nhập để sử dụng các tính năng hiện có.' : 'Create an account or sign in to use the available features.'}
          </p>
          <Button onClick={() => navigate('/auth')} className="font-heading font-semibold bg-gradient-to-r from-[#00d4aa] to-[#0ea5e9] text-white">
            {lang === 'vi' ? 'Bắt đầu' : 'Get started'}
          </Button>
        </div>
      </motion.div>
    </section>
  );
};

export default CTABottom;
