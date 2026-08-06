import { Wind, Phone, Mail, MapPinned } from 'lucide-react';

const ContactFooter = () => (
  <footer className="mt-12 border-t border-border bg-card/50 backdrop-blur-sm">
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Wind className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold text-foreground">AirWeave Intelligence Team</h3>
            <p className="text-[10px] text-muted-foreground font-body">Nền tảng dữ liệu không khí thông minh</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 text-sm font-body text-muted-foreground">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" />
            <span>0828413747</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            <a href="mailto:mytrinhh.bb@gmail.com" className="hover:text-primary transition-colors">mytrinhh.bb@gmail.com</a>
          </div>
          <div className="flex items-center gap-2">
            <MapPinned className="w-4 h-4 text-primary" />
            <span>TP. Hồ Chí Minh</span>
          </div>
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-border text-center">
        <p className="text-[10px] text-muted-foreground font-body">© 2026 AirWeave. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export default ContactFooter;
