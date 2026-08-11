import React from "react";
import { useRouter } from "@/lib/router";
import {
  Briefcase,
  Lightbulb,
  Cpu,
  CheckCircle,
  Rocket,
  Eye,
  Heart,
  BookOpen,
  Award,
  Trophy,
  ShieldCheck,
  Phone,
  Mail,
  Globe,
  MapPin,
  Linkedin,
  Calendar,
} from "lucide-react";
import IconBadge from "@/components/IconBadge";

const timeline = [
  { title: "Vision", icon: Lightbulb, text: "Started with an idea to transform home services using technology." },
  { title: "Development", icon: Cpu, text: "Learned React, TypeScript, Tailwind CSS, Supabase, Cloudflare and AI tools." },
  { title: "Testing", icon: CheckCircle, text: "Improved every feature, solved deployment issues and optimized performance." },
  { title: "Launch", icon: Rocket, text: "Successfully launched VATTAMS HOME SERVICES." },
];

const principles = [
  { label: "Customer First", icon: Heart },
  { label: "Innovation", icon: Lightbulb },
  { label: "Transparency", icon: Eye },
  { label: "Quality Service", icon: Award },
  { label: "Continuous Learning", icon: BookOpen },
  { label: "Technology Driven", icon: Cpu },
];

const achievements = [
  "Built VATTAMS HOME SERVICES",
  "Developed in Nearly 3 Months",
  "Built Primarily Using a Mobile Phone",
  "Cloudflare Production Deployment",
  "React + TypeScript Platform",
  "Supabase Backend Integration",
  "Customer & Technician Portals",
  "AI-Assisted Development",
];

const Founder = () => {
  const { navigate } = useRouter();
  return (
    <main className="min-h-screen bg-white text-gray-900">

      {/* ================= HERO ================= */}

      <section className="bg-gradient-to-r from-slate-900 via-blue-900 to-black text-white">

        <div className="max-w-7xl mx-auto px-6 py-20">

          <div className="grid lg:grid-cols-2 gap-12 items-center">

            <div>

              <span className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                <Briefcase size={16} aria-hidden="true" />
                Founder & CEO
              </span>

              <h1 className="text-5xl lg:text-6xl font-extrabold mt-6 leading-tight">
                Venkatesan
                <br />
                Ponniah
              </h1>

              <h2 className="text-2xl text-orange-400 mt-4">
                VATTAMS HOME SERVICES
              </h2>

              <p className="text-xl mt-8 text-gray-300 leading-9">
                <strong>From Vision to Reality</strong>
              </p>

              <p className="mt-6 text-lg leading-9 text-gray-300">

                Every successful company begins with a dream.

                VATTAMS HOME SERVICES was built through determination,
                continuous learning and an unwavering commitment to
                creating a trusted home services platform.

              </p>

            </div>

            <div className="flex justify-center">

              <img
                src="/images/file_0000000068408208aecee2ee49e66798.jpg"
                alt="Venkatesan Ponniah"
                className="rounded-3xl shadow-2xl border-4 border-orange-500 max-w-md w-full object-cover"
              />

            </div>

          </div>

        </div>

      </section>

      {/* ================= MY STORY ================= */}

      <section className="py-20">

        <div className="max-w-6xl mx-auto px-6">

          <h2 className="text-4xl font-bold text-center mb-12 flex items-center justify-center gap-3">
            <BookOpen size={32} className="text-orange-500" aria-hidden="true" />
            My Journey
          </h2>

          <div className="space-y-8 text-lg leading-9">

            <p>

              My name is <strong>Venkatesan Ponniah</strong>,
              Founder & CEO of VATTAMS HOME SERVICES.

            </p>

            <p>

              Nearly three months ago,
              VATTAMS existed only as an idea.

            </p>

            <p>

              I didn't have a development team.

              I didn't have investors.

              I didn't have a software company.

              What I had was determination,
              curiosity and a single mobile phone.

            </p>

            <p>

              Every feature of VATTAMS was developed
              through continuous learning,
              experimentation and perseverance.

            </p>

            <p>

              Every page,
              every booking flow,
              every dashboard,
              every deployment,
              every improvement
              represented another step toward the vision.

            </p>

            <p>

              Today VATTAMS HOME SERVICES has become
              a growing digital platform connecting
              customers with trusted home service professionals.

            </p>

          </div>

        </div>

      </section>

      {/* ================= TIMELINE ================= */}

      <section className="bg-slate-100 py-20">

        <div className="max-w-6xl mx-auto px-6">

          <h2 className="text-4xl font-bold text-center mb-12">

            Journey Timeline

          </h2>

          <div className="grid md:grid-cols-4 gap-6">

            {timeline.map((step) => (
              <div key={step.title} className="bg-white rounded-2xl shadow-lg p-6">

                <IconBadge icon={step.icon} size="md" variant="amber" className="mb-4" />

                <h3 className="font-bold text-orange-500">

                  {step.title}

                </h3>

                <p className="mt-4">

                  {step.text}

                </p>

              </div>
            ))}

          </div>

        </div>

      </section>

      {/* ================= MISSION ================= */}

      <section className="py-20">

        <div className="max-w-5xl mx-auto px-6 text-center">

          <div className="flex justify-center mb-4">
            <IconBadge icon={Rocket} size="lg" variant="blue" />
          </div>

          <h2 className="text-4xl font-bold">

            Mission

          </h2>

          <p className="mt-8 text-lg leading-9">

            To provide trusted,
            transparent,
            affordable and technology-driven
            home services while empowering
            skilled technicians across India.

          </p>

        </div>

      </section>

      {/* ================= VISION ================= */}

      <section className="bg-slate-100 py-20">

        <div className="max-w-5xl mx-auto px-6 text-center">

          <div className="flex justify-center mb-4">
            <IconBadge icon={Eye} size="lg" variant="blue" />
          </div>

          <h2 className="text-4xl font-bold">

            Vision

          </h2>

          <p className="mt-8 text-lg leading-9">

            To become India's most trusted
            AI-powered Home Services platform
            delivering excellence through
            innovation,
            technology
            and customer satisfaction.

          </p>

        </div>

      </section>      {/* ================= LEADERSHIP ================= */}

      <section className="py-20">

        <div className="max-w-6xl mx-auto px-6">

          <h2 className="text-4xl font-bold text-center mb-12">
            Leadership Principles
          </h2>

          <div className="grid md:grid-cols-3 gap-6">

            {principles.map((item) => (
              <div
                key={item.label}
                className="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-xl transition"
              >
                <div className="flex justify-center mb-4">
                  <IconBadge icon={item.icon} size="md" variant="amber" />
                </div>
                <h3 className="text-xl font-bold text-orange-500">{item.label}</h3>
              </div>
            ))}

          </div>

        </div>

      </section>

      {/* ================= ACHIEVEMENTS ================= */}

      <section className="bg-slate-100 py-20">

        <div className="max-w-6xl mx-auto px-6">

          <h2 className="text-4xl font-bold text-center mb-12 flex items-center justify-center gap-3">
            <Trophy size={32} className="text-orange-500" aria-hidden="true" />
            Achievements
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">

            {achievements.map((item) => (
              <div
                key={item}
                className="bg-white rounded-xl shadow p-6 text-center font-semibold"
              >
                <Award size={22} className="mx-auto mb-3 text-orange-500" aria-hidden="true" />
                {item}
              </div>
            ))}

          </div>

        </div>

      </section>

      {/* ================= TECHNOLOGY ================= */}

      <section className="py-20">

        <div className="max-w-6xl mx-auto px-6">

          <h2 className="text-4xl font-bold text-center mb-12 flex items-center justify-center gap-3">
            <Cpu size={32} className="text-blue-900" aria-hidden="true" />
            Technology Stack
          </h2>

          <div className="flex flex-wrap justify-center gap-4">

            {[
              "React",
              "TypeScript",
              "Vite",
              "Tailwind CSS",
              "Supabase",
              "Cloudflare",
              "GitHub",
              "AI Assisted Development",
            ].map((tech) => (
              <span
                key={tech}
                className="px-6 py-3 rounded-full bg-blue-900 text-white font-semibold"
              >
                {tech}
              </span>
            ))}

          </div>

        </div>

      </section>

      {/* ================= PERSONAL MESSAGE ================= */}

      <section className="bg-gradient-to-r from-blue-900 via-slate-900 to-black text-white py-20">

        <div className="max-w-5xl mx-auto px-6 text-center">

          <h2 className="text-4xl font-bold mb-8">
            A Message From The Founder
          </h2>

          <p className="text-lg leading-9 text-gray-300">

            Every successful platform starts with a single decision —
            the decision to begin.

            VATTAMS HOME SERVICES represents persistence,
            continuous learning and the belief that technology
            can transform everyday lives.

            This journey is only the beginning.

          </p>

        </div>

      </section>

      {/* ================= CREDENTIALS & CONTACT ================= */}

      <section className="bg-slate-100 py-20">

        <div className="max-w-6xl mx-auto px-6">

          <h2 className="text-4xl font-bold text-center mb-12">
            Government Registration &amp; Contact
          </h2>

          <div className="grid md:grid-cols-2 gap-8">

            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={24} className="text-orange-500" aria-hidden="true" />
                <h3 className="text-xl font-bold text-orange-500">
                  MSME (Udyam) Registered Enterprise
                </h3>
              </div>
              <p className="text-gray-600">
                Government of India — Udyam Registered Enterprise
              </p>
              <p className="mt-2 font-semibold text-blue-900">
                Udyam Registration Number: UDYAM-TN-02-0274720
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h3 className="text-xl font-bold text-orange-500 mb-4">
                Contact
              </h3>
              <p className="text-gray-600 flex items-center gap-2">
                <Phone size={16} className="text-gray-400" aria-hidden="true" /> +91 63828 39861
              </p>
              <p className="text-gray-600 flex items-center gap-2 mt-2">
                <Mail size={16} className="text-gray-400" aria-hidden="true" /> info@vattams.net
              </p>
              <p className="text-gray-600 flex items-center gap-2 mt-2">
                <Globe size={16} className="text-gray-400" aria-hidden="true" /> www.vattams.net
              </p>
              <p className="text-gray-600 flex items-center gap-2 mt-2">
                <MapPin size={16} className="text-gray-400" aria-hidden="true" /> Chennai, Tamil Nadu, India
              </p>
            </div>

          </div>

        </div>

      </section>

      {/* ================= SOCIAL LINKS ================= */}

      <section className="py-20">

        <div className="max-w-6xl mx-auto px-6 text-center">

          <h2 className="text-4xl font-bold mb-10">
            Connect With Me
          </h2>

          <div className="flex flex-wrap justify-center gap-5">

            <a
              href="https://vattams.net"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-xl font-semibold transition"
            >
              <Globe size={18} aria-hidden="true" />
              Visit Website
            </a>

            <a
              href="https://www.linkedin.com/in/venkatesan-ponniah-371760427"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-8 py-4 rounded-xl font-semibold transition"
            >
              <Linkedin size={18} aria-hidden="true" />
              LinkedIn Profile
            </a>

          </div>

        </div>

      </section>

      {/* ================= CTA ================= */}

      <section className="bg-orange-500 text-white py-20">

        <div className="max-w-6xl mx-auto px-6 text-center">

          <h2 className="text-5xl font-bold">
            Let's Build the Future Together
          </h2>

          <p className="mt-6 text-xl">
            Service With Care
          </p>

          <div className="flex flex-wrap justify-center gap-5 mt-10">

            <button
              onClick={() => navigate('booking')}
              className="inline-flex items-center gap-2 bg-white text-orange-500 px-8 py-4 rounded-xl font-bold"
            >
              <Calendar size={18} aria-hidden="true" />
              Book a Service
            </button>

            <button
              onClick={() => navigate('join-technician')}
              className="inline-flex items-center gap-2 bg-black text-white px-8 py-4 rounded-xl font-bold"
            >
              <Briefcase size={18} aria-hidden="true" />
              Join as Technician
            </button>

            <button
              onClick={() => navigate('contact')}
              className="inline-flex items-center gap-2 bg-blue-900 text-white px-8 py-4 rounded-xl font-bold"
            >
              <Phone size={18} aria-hidden="true" />
              Contact Us
            </button>

          </div>

        </div>

      </section>

    </main>
  );
};

export default Founder;