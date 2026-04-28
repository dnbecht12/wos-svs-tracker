import React from "react";
import { Link } from "react-router-dom";

const C = new Proxy({}, { get(_, k) { return `var(--c-${k})`; } });
const mono = { fontFamily:"'Space Mono',monospace" };

const H = ({ children }) => (
  <div style={{ fontSize:11, fontWeight:800, color:C.accent, letterSpacing:"1.5px",
    textTransform:"uppercase", ...mono, margin:"24px 0 8px",
    paddingBottom:6, borderBottom:`1px solid ${C.border}` }}>
    {children}
  </div>
);
const P = ({ children }) => (
  <p style={{ fontSize:12, color:C.textSec, lineHeight:1.7, marginBottom:8 }}>{children}</p>
);
const Li = ({ children }) => (
  <li style={{ fontSize:12, color:C.textSec, lineHeight:1.7, marginBottom:4 }}>{children}</li>
);

export default function TermsPage() {
  return (
    <div style={{ background:C.bg, minHeight:"100vh", fontFamily:"Syne, sans-serif" }}>
      {/* Nav bar */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`,
        padding:"12px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <Link to="/" style={{ textDecoration:"none", color:C.accent,
          fontFamily:"Syne,sans-serif", fontWeight:800, fontSize:16 }}>
          TUNDRA <span style={{color:C.textSec}}>COMMAND</span>
        </Link>
        <Link to="/" style={{ textDecoration:"none", color:C.textSec, fontSize:12,
          fontFamily:"Space Mono,monospace" }}>← Back</Link>
      </div>

      <div style={{ maxWidth:780, margin:"0 auto", padding:"32px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom:24 }}>
          <h1 style={{ fontSize:24, fontWeight:800, color:C.textPri,
            fontFamily:"Syne,sans-serif", marginBottom:4 }}>Terms and Conditions</h1>
          <div style={{ fontSize:11, color:C.textDim, ...mono }}>
            Last Updated: April 27, 2026 · Effective Date: April 27, 2026
          </div>
        </div>

        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"24px 28px" }}>
          <P>These Terms and Conditions ("Terms") govern your access to and use of Tundra Command ("we," "us," "our," or "the Service"), operated by Tundra Command, doing business as Tundra Command under the laws of the State of Florida. By accessing or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.</P>

          <H>1. Description of Service</H>
          <P>Tundra Command is an independent, fan-made web application designed to assist players of Whiteout Survival ("the Game") with planning, stat tracking, and event management. Tundra Command is not affiliated with, endorsed by, sponsored by, or in any way officially connected with Century Games, the developer and publisher of Whiteout Survival, or any of its subsidiaries or affiliates. All game names, trademarks, characters, mechanics, and related content referenced within this Service are the property of their respective owners.</P>

          <H>2. Acceptance of Terms</H>
          <P>By creating an account or using the Service in any capacity — including as a guest — you represent that you are at least 13 years of age, or the age of digital consent in your jurisdiction if higher. If you are under 18, you represent that you have your parent or legal guardian's permission to use the Service.</P>
          <P>We reserve the right to modify these Terms at any time. Continued use of the Service after changes are posted constitutes acceptance of the revised Terms.</P>

          <H>3. Account Registration</H>
          <P>You may use portions of the Service as a guest without registering. Guest data is stored locally in your browser session and is not persisted across sessions or devices. To access full features including cloud sync and cross-device access, you must register an account using a valid email address and password, or via Discord OAuth.</P>
          <P>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You agree to notify us immediately of any unauthorized use of your account. You may not create accounts using automated methods or create multiple accounts to circumvent restrictions.</P>
          <P>We reserve the right to terminate or suspend any account at our sole discretion, including for violation of these Terms, without notice or liability.</P>

          <H>4. Acceptable Use</H>
          <P>You agree to use the Service only for lawful purposes. You agree NOT to:</P>
          <ul style={{ paddingLeft:20, margin:"0 0 8px" }}>
            {[
              "Use the Service for any unlawful purpose or in violation of any applicable law or regulation;",
              "Attempt to gain unauthorized access to the Service, its servers, databases, or related systems;",
              "Reverse engineer, decompile, or attempt to derive the source code of the Service;",
              "Use automated tools, bots, scrapers, or scripts to access the Service without our express written permission;",
              "Transmit any content that is defamatory, obscene, harassing, threatening, or otherwise objectionable;",
              "Impersonate any person or entity, or misrepresent your affiliation with any person or entity;",
              "Upload or transmit any viruses, malware, or other malicious code;",
              "Interfere with or disrupt the integrity or performance of the Service;",
              "Attempt to probe, scan, or test the vulnerability of the Service or breach any security measures;",
              "Use the Service to collect or harvest personally identifiable information from other users.",
            ].map((item, i) => <Li key={i}>({String.fromCharCode(97+i)}) {item}</Li>)}
          </ul>

          <H>5. User-Submitted Data</H>
          <P>You retain ownership of any game statistics, planning data, and personal configuration you submit ("User Data"). By submitting User Data, you grant Tundra Command a non-exclusive, royalty-free license to store, process, and display that data solely for the purpose of providing the Service to you.</P>
          <P>Hero stat submissions you voluntarily contribute to the shared database may be reviewed, accepted, rejected, or removed by the administrator at their sole discretion, and accepted submissions may be visible to other users. You are solely responsible for the accuracy of data you enter.</P>

          <H>6. Intellectual Property</H>
          <P>The Service, including its code, design, layout, visual elements, features, and original content (excluding User Data and third-party game content), is owned by Tundra Command and is protected by applicable copyright, trademark, and other intellectual property laws. You may not copy, reproduce, modify, distribute, or create derivative works from any portion of the Service without our prior written consent.</P>
          <P>All Whiteout Survival game names, trademarks, characters, artwork, and game mechanics referenced in this Service are the property of Century Games. Their use here is purely for fan-made, non-commercial reference purposes. We claim no ownership of any such third-party intellectual property.</P>

          <H>7. Privacy and Data</H>
          <P>We collect and store the minimum data necessary to provide the Service, including your email address, authentication tokens, and game planning data you choose to save. We use Supabase (a third-party service provider) to store and sync user data. We do not sell, rent, or trade your personal information to third parties.</P>

          <H>8. Payment Terms and Subscriptions</H>
          <P>Paid subscription tiers are available. All fees are displayed clearly before purchase; subscriptions auto-renew unless cancelled before the renewal date; you may cancel at any time through your account settings; refunds are issued at our sole discretion except where required by law. All transactions are processed through Stripe. We do not store payment card information on our servers.</P>

          <H>9. Disclaimers and Warranties</H>
          <P>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. We do not warrant that the Service will be uninterrupted or error-free, that stored data will be secure or not lost, that game statistics or calculations are accurate or current, or that the Service will meet your specific requirements.</P>

          <H>10. Limitation of Liability</H>
          <P>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, TUNDRA COMMAND AND ITS OPERATOR SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED THE GREATER OF: (A) THE AMOUNT YOU PAID TO US IN THE TWELVE MONTHS PRECEDING THE CLAIM, OR (B) USD $100.00.</P>

          <H>11. Governing Law</H>
          <P>These Terms shall be governed by the laws of the State of Florida, United States. Any dispute shall first be attempted to be resolved through informal negotiation — contact us at deathwishwos@gmail.com. If informal resolution fails, any legal action shall be brought in the state or federal courts located in Florida.</P>

          <H>15. General Provisions</H>
          <P><strong style={{color:C.textPri}}>Entire Agreement.</strong> These Terms constitute the entire agreement between you and Tundra Command regarding the Service. <strong style={{color:C.textPri}}>Severability.</strong> If any provision is found unenforceable, the remaining provisions continue in full force.</P>

          <div style={{ marginTop:24, padding:"14px 16px", background:C.surface,
            borderRadius:8, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, color:C.textDim, ...mono, lineHeight:1.6 }}>
              © 2026 Tundra Command. All rights reserved.<br/>
              Tundra Command is not affiliated with Century Games or Whiteout Survival.<br/>
              Questions? Contact us at deathwishwos@gmail.com
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
