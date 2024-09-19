import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const StyledHeader = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <>
      <div style={{ background: "#000", padding: "10px" }}>
        <style jsx global>{`
          h1 {
            font-family: "Bungee Inline", sans-serif;
            font-weight: 400;
            font-size: 50px;
            margin-top: 20px;
          }
          body {
            background: #eee;
          }
          nav {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .links {
            display: flex;
            gap: 12px;
          }
          .link {
            color: #fff;
            text-decoration: none;
            font-size: 16px;
            font-weight: bold;
            padding: 10px 15px;
            border-radius: 5px;
            transition: background-color 0.3s ease, color 0.3s ease;
          }
          .link:hover {
            background-color: #444;
            color: #f0f0f0;
          }
          .link:active {
            background-color: #f89c1c;
            color: #fff;
          }
          .menu-button {
            display: none;
            background: none;
            border: none;
            color: white;
            font-size: 30px;
          }
          @media (max-width: 768px) {
            .links {
              display: ${menuOpen ? "flex" : "none"};
              flex-direction: column;
            }
            .menu-button {
              display: block;
            }
          }
        `}</style>

        <Image
          priority
          src="/images/sl-logo.png"
          width={720}
          height={80}
          style={{ objectFit: "contain" }}
          alt="Logo"
        />
      </div>
      <nav style={{ background: "#333", padding: "10px" }}>
        <button className="menu-button" onClick={toggleMenu}>
          ☰
        </button>
        <div className="links">
          <Link href="/" className="link">
            PBN&apos;J
          </Link>
          <Link
            href="https://sales.statuscrawl.io/admin/article/list"
            className="link"
          >
            PBN&apos;J List
          </Link>
          <Link href="/pbn-site-submissions" className="link">
            PBN Posts
          </Link>
          <Link href="/pbn-form" className="link">
            New PBN Post
          </Link>
          <Link href="/company-info" className="link">
            Wiki Scraper
          </Link>
          <Link href="/superstar-sites" className="link">
            Superstar Sites
          </Link>
          <Link href="/superstar-site-submissions" className="link">
            Superstar Site Submissions
          </Link>
          <Link href="/superstar" className="link">
            New Superstar Post
          </Link>
          <Link href="/superstar-post-capture-form" className="link">
            Capture Wordpress Post
          </Link>
        </div>
      </nav>
    </>
  );
};

export default StyledHeader;
