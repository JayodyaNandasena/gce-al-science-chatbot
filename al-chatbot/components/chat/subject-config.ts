import { Dna, FlaskConical, Atom } from "lucide-react";

export const SUBJECTS = {
    biology: {
        name: 'Biology',
        icon: Dna,
        gradient: 'from-emerald-700 to-teal-600',
        bgGradient: 'from-emerald-50 via-teal-50 to-cyan-50',
        borderColor: 'border-emerald-200',
        hoverBorder: 'hover:border-emerald-400',
        textColor: 'text-emerald-700',
        iconColor: 'text-emerald-600',
        greeting: 'Hi! I\'m your Biology Learning Assistant. I can help you understand concepts in cell biology, genetics, ecology, anatomy, and more. What would you like to learn about today?',
        suggestions: [
            "Explain photosynthesis",
            "Difference between mitosis and meiosis",
            // "How does natural selection work?",
            "Explain the nature of microorganisms",
            "How does feedback regulation maintain homeostasis at the cellular level?"
        ]
    },
    chemistry: {
        name: 'Chemistry',
        icon: FlaskConical,
        gradient: 'from-violet-800 to-purple-800',
        bgGradient: 'from-violet-50 via-purple-50 to-fuchsia-50',
        borderColor: 'border-violet-200',
        hoverBorder: 'hover:border-violet-400',
        textColor: 'text-violet-700',
        iconColor: 'text-violet-600',
        greeting: 'Hello! I\'m your Chemistry Learning Assistant. I can help you with organic chemistry, inorganic chemistry, chemical reactions, periodic table, and more. What chemistry topic interests you?',
        suggestions: [
            "Explain chemical bonding",
            "What is oxidation-reduction?",
            "How to balance equations?",
            "What are functional groups?"
        ]
    },
    physics: {
        name: 'Physics',
        icon: Atom,
        gradient: 'from-blue-800 to-indigo-800',
        bgGradient: 'from-blue-50 via-indigo-50 to-cyan-50',
        borderColor: 'border-blue-200',
        hoverBorder: 'hover:border-blue-400',
        textColor: 'text-blue-700',
        iconColor: 'text-blue-600',
        greeting: 'Hey there! I\'m your Physics Learning Assistant. I can help you understand mechanics, thermodynamics, electromagnetism, and more. What would you like to explore?',
        suggestions: [
            "Explain Newton's laws"
        ]
    }
};

// export const SUBJECTS = {
//     biology: {
//         name: "Biology",
//         icon: Dna,
//
//         bg: "bg-emerald-50",
//         borderColor: "border-emerald-200",
//         hoverBorder: "hover:border-emerald-300",
//         textColor: "text-emerald-800",
//         iconColor: "text-emerald-600",
//
//         greeting:
//             "Hi! I'm your Biology Learning Assistant. I can help you understand cell biology, genetics, ecology, anatomy, and more. What would you like to learn today?",
//         suggestions: [
//             "Explain photosynthesis",
//             "What is DNA replication?",
//             "Difference between mitosis and meiosis",
//             "How does natural selection work?"
//         ]
//     },
//
//     chemistry: {
//         name: "Chemistry",
//         icon: FlaskConical,
//
//         bg: "bg-violet-50",
//         borderColor: "border-violet-200",
//         hoverBorder: "hover:border-violet-300",
//         textColor: "text-violet-800",
//         iconColor: "text-violet-600",
//
//         greeting:
//             "Hello! I'm your Chemistry Learning Assistant. I can help with reactions, bonding, stoichiometry, and more. What topic are you working on?",
//         suggestions: [
//             "Explain chemical bonding",
//             "What is oxidation-reduction?",
//             "How to balance equations?",
//             "What are functional groups?"
//         ]
//     },
//
//     physics: {
//         name: "Physics",
//         icon: Atom,
//
//         bg: "bg-sky-50",
//         borderColor: "border-sky-200",
//         hoverBorder: "hover:border-sky-300",
//         textColor: "text-sky-800",
//         iconColor: "text-sky-600",
//
//         greeting:
//             "Hey! I'm your Physics Learning Assistant. I can help with mechanics, electricity, waves, and modern physics. What shall we explore?",
//         suggestions: [
//             "Explain Newton's laws",
//             "What is quantum mechanics?",
//             "How does electricity work?",
//             "What is relativity?"
//         ]
//     }
// };
