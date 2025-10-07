// src/app/dashboard/tokenOverview/[tokenId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Copy,
  ExternalLink,
  FileText,
  Globe,
  Twitter,
  QrCode,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import WarningIcon from "@/components/icons/WarningIcon";
import TokenSidebar from "@/components/dashboard/TokenSidebar";

// Mock token data - matches code-lens tokens
const mockTokens = [
  {
    id: 1,
    name: "Ethereum",
    symbol: "ETH",
    contractAddress: "0x0000000000000000000000000000000000000000",
    decimals: 18,
    balance: "1.25843",
    price: 4478.78,
    change24h: -1.06,
    volume24h: 8478788,
    marketCap: 12478088345,
    description:
      "Ethereum is a global, open-source platform for decentralized applications. In other words, the vision is to create a world computer that anyone can build applications in a decentralized manner; while all states and data are distributed and publicly accessible. Ethereum supports smart contracts in which developers can write code in order to program digital value.",
    homepage: "https://ethereum.org",
    whitepaper: "https://ethereum.org/whitepaper/",
    blockchain_site: "https://etherscan.io",
    twitter: "ethereum",
  },
  {
    id: 2,
    name: "Polkadot",
    symbol: "DOT",
    contractAddress: "0x0000000000000000000000000000000000000001",
    decimals: 10,
    balance: "478.78",
    price: 478.78,
    change24h: -1.06,
    volume24h: 8478788,
    marketCap: 78088345,
    description:
      "Polkadot is a next-generation blockchain protocol connecting multiple specialized blockchains into one unified network.",
    homepage: "https://polkadot.network",
    blockchain_site: "https://polkascan.io",
    twitter: "Polkadot",
  },
  {
    id: 3,
    name: "Cardano",
    symbol: "CAR",
    contractAddress: "0x0000000000000000000000000000000000000002",
    decimals: 6,
    balance: "8.7",
    price: 8.7,
    change24h: 1.06,
    volume24h: 76788,
    marketCap: 8088345,
    description:
      "Cardano is a blockchain platform for changemakers, innovators, and visionaries, with the tools and technologies required to create possibility for the many.",
    homepage: "https://cardano.org",
    blockchain_site: "https://cardanoscan.io",
    twitter: "Cardano",
  },
];

// Mock news data
const mockNewsData = [
  {
    id: 1,
    title:
      "ETH price rebounds to $4,540 as U.S. government shutdown fuels safe-haven demand",
    description:
      "Crypto, short for cryptocurrency, is a digital or virtual currency secured by cryptography. It operates on decentralized blockchain technology, allowing peer-to-peer transactions without the need for intermediaries like banks.",
    author: "Liam Owiboes",
    date: "Oct 2, 2025, 07:56",
    image: "/eth-crystal.jpg",
    trending: true,
  },
  {
    id: 2,
    title: "Bitcoin reaches new all-time high as institutional adoption grows",
    description:
      "Major financial institutions continue to embrace Bitcoin, driving unprecedented demand and pushing prices to record levels across global markets.",
    author: "Sarah Chen",
    date: "Oct 3, 2025, 14:22",
    image: "/btc-coins.jpg",
    trending: false,
  },
  {
    id: 3,
    title: "DeFi protocols see surge in total value locked",
    description:
      "Decentralized finance platforms experience massive growth as users seek higher yields and more control over their financial assets.",
    author: "Michael Torres",
    date: "Oct 4, 2025, 09:15",
    image: "/defi-network.jpg",
    trending: true,
  },
];

// Reusable News Card Component
interface NewsCardProps {
  title: string;
  description: string;
  author: string;
  date: string;
  image: string;
  trending?: boolean;
}

const NewsCard = ({
  title,
  description,
  author,
  date,
  image,
  trending = false,
}: NewsCardProps) => {
  return (
    <div className="rounded-[24px] border border-[#2C2C2C] p-4 hover:border-[#F7B410] transition-all duration-300 cursor-pointer group">
      <div className="flex gap-6 h-full">
        {/* Image - Full height */}
        <div className="flex-shrink-0 w-[140px] rounded-[20px] overflow-hidden bg-gradient-to-br from-purple-600 to-blue-500 relative self-stretch">
          {/* Placeholder for image - replace with actual image */}
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-16 bg-white/20 rounded-lg backdrop-blur-sm" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          {/* Title with trending icon at the end */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-white text-[18px] font-saothsi leading-[1.4] line-clamp-2 group-hover:text-[#F7B410] transition-colors flex-1">
              {title}
            </h3>
            {trending && (
              <div className="flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="28"
                  height="28"
                  viewBox="0 0 45 45"
                  fill="none"
                >
                  <rect
                    x="0.0737705"
                    y="0.0737705"
                    width="44.8525"
                    height="44.8525"
                    rx="22.4262"
                    fill="#4B3A08"
                    fillOpacity="0.2"
                  />
                  <rect
                    x="0.0737705"
                    y="0.0737705"
                    width="44.8525"
                    height="44.8525"
                    rx="22.4262"
                    stroke="#E2AF19"
                    strokeWidth="0.147541"
                  />
                  <path
                    d="M31.1705 21.2552C30.8123 20.788 30.3762 20.3831 29.9713 19.9781C28.9278 19.0437 27.7442 18.374 26.7474 17.3928C24.4269 15.119 23.9129 11.3656 25.3925 8.48438C23.9129 8.84258 22.6202 9.65244 21.5145 10.5402C17.4808 13.7796 15.8922 19.4953 17.7922 24.4012C17.8545 24.557 17.9168 24.7127 17.9168 24.9152C17.9168 25.2578 17.6832 25.5693 17.3717 25.6939C17.0135 25.8496 16.6398 25.7562 16.3438 25.507C16.2554 25.4329 16.1815 25.3432 16.1258 25.2422C14.3659 23.0151 14.0856 19.8224 15.2692 17.2682C12.6683 19.3863 11.2511 22.9684 11.4535 26.348C11.547 27.1267 11.6404 27.9054 11.9052 28.6841C12.1232 29.6186 12.5437 30.553 13.011 31.3785C14.693 34.0728 17.6054 36.004 20.7358 36.3934C24.0687 36.8139 27.6351 36.2065 30.1893 33.9015C33.0394 31.3162 34.0361 27.1734 32.5722 23.6225L32.3697 23.2176C32.0426 22.5012 31.1705 21.2552 31.1705 21.2552ZM26.249 31.067C25.813 31.4408 25.0965 31.8457 24.5359 32.0014C22.7916 32.6244 21.0473 31.7523 20.0194 30.7244C21.8727 30.2883 22.9785 28.9177 23.3055 27.5316C23.5703 26.2857 23.0719 25.2578 22.8694 24.0586C22.6825 22.9061 22.7137 21.9249 23.1342 20.8503C23.4301 21.4421 23.7416 22.0339 24.1154 22.5012C25.3146 24.0586 27.1991 24.7439 27.604 26.8619C27.6663 27.08 27.6974 27.298 27.6974 27.5316C27.7442 28.8087 27.1835 30.2104 26.249 31.067Z"
                    fill="#E2AF19"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Description */}
          <p className="text-[#F9EFD1] text-[13px] leading-[1.5] line-clamp-2 mt-2">
            {description}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#F7B410] flex items-center justify-center text-[10px] font-semibold text-black">
                {author.charAt(0)}
              </div>
              <span className="text-[#fff] text-[12px] font-medium">
                By {author}
              </span>
              <span className="text-[#fff] text-[12px]">{date}</span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 p-1 px-2 border rounded-[10px] border-[#2C2C2C]">
              <button className="flex items-center justify-center hover:opacity-80 transition-opacity">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 30 30"
                  fill="none"
                >
                  <path
                    d="M9.91666 18.9273C9.68707 18.9273 9.45749 18.8427 9.27624 18.6615C8.92582 18.3111 8.92582 17.7311 9.27624 17.3807L13.1429 13.514C13.3362 13.3207 13.59 13.224 13.8679 13.2482C14.1337 13.2723 14.3754 13.4173 14.5325 13.6469L15.8496 15.6286L20.1392 11.339C20.4896 10.9886 21.0696 10.9886 21.42 11.339C21.7704 11.6894 21.7704 12.2694 21.42 12.6198L16.345 17.6948C16.1517 17.8882 15.8979 17.9848 15.62 17.9607C15.3542 17.9365 15.1125 17.7915 14.9554 17.5619L13.6383 15.5802L10.5571 18.6615C10.3758 18.8427 10.1462 18.9273 9.91666 18.9273Z"
                    fill="#2ECC71"
                  />
                  <path
                    d="M20.7917 15.3014C20.2962 15.3014 19.8854 14.8906 19.8854 14.3952V12.8848H18.375C17.8796 12.8848 17.4688 12.4739 17.4688 11.9785C17.4688 11.4831 17.8796 11.0723 18.375 11.0723H20.7917C21.2871 11.0723 21.6979 11.4831 21.6979 11.9785V14.3952C21.6979 14.8906 21.2871 15.3014 20.7917 15.3014Z"
                    fill="#2ECC71"
                  />
                  <path
                    d="M18.9791 27.9889H11.7291C5.1679 27.9889 2.36456 25.1856 2.36456 18.6243V11.3743C2.36456 4.8131 5.1679 2.00977 11.7291 2.00977H18.9791C25.5404 2.00977 28.3437 4.8131 28.3437 11.3743V18.6243C28.3437 25.1856 25.5404 27.9889 18.9791 27.9889ZM11.7291 3.82227C6.15873 3.82227 4.17706 5.80393 4.17706 11.3743V18.6243C4.17706 24.1948 6.15873 26.1764 11.7291 26.1764H18.9791C24.5496 26.1764 26.5312 24.1948 26.5312 18.6243V11.3743C26.5312 5.80393 24.5496 3.82227 18.9791 3.82227H11.7291Z"
                    fill="#2ECC71"
                  />
                </svg>
              </button>
              <button className="flex items-center justify-center hover:opacity-80 transition-opacity">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 30 30"
                  fill="none"
                >
                  <path
                    d="M20.0833 18.9273C19.8537 18.9273 19.6241 18.8427 19.4429 18.6615L15.1533 14.3719L13.8362 16.3536C13.6912 16.5832 13.4375 16.7282 13.1716 16.7523C12.8937 16.7765 12.6279 16.6798 12.4466 16.4865L8.57995 12.6198C8.22953 12.2694 8.22953 11.6894 8.57995 11.339C8.93037 10.9886 9.51037 10.9886 9.86078 11.339L12.942 14.4202L14.2591 12.4386C14.4041 12.2211 14.6458 12.0761 14.9237 12.0398C15.2016 12.0157 15.4675 12.1123 15.6487 12.3057L20.7237 17.3807C21.0741 17.7311 21.0741 18.3111 20.7237 18.6615C20.5425 18.8427 20.3129 18.9273 20.0833 18.9273Z"
                    fill="#E74C3C"
                  />
                  <path
                    d="M20.0834 18.9264H17.6667C17.1713 18.9264 16.7605 18.5156 16.7605 18.0202C16.7605 17.5248 17.1713 17.1139 17.6667 17.1139H19.1772V15.6035C19.1772 15.1081 19.588 14.6973 20.0834 14.6973C20.5788 14.6973 20.9897 15.1081 20.9897 15.6035V18.0202C20.9897 18.5156 20.5788 18.9264 20.0834 18.9264Z"
                    fill="#E74C3C"
                  />
                  <path
                    d="M18.2708 27.9889H11.0208C4.45958 27.9889 1.65625 25.1856 1.65625 18.6243V11.3743C1.65625 4.8131 4.45958 2.00977 11.0208 2.00977H18.2708C24.8321 2.00977 27.6354 4.8131 27.6354 11.3743V18.6243C27.6354 25.1856 24.8321 27.9889 18.2708 27.9889ZM11.0208 3.82227C5.45042 3.82227 3.46875 5.80393 3.46875 11.3743V18.6243C3.46875 24.1948 5.45042 26.1764 11.0208 26.1764H18.2708C23.8412 26.1764 25.8229 24.1948 25.8229 18.6243V11.3743C25.8229 5.80393 23.8412 3.82227 18.2708 3.82227H11.0208Z"
                    fill="#E74C3C"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function NewsFeed() {
  const params = useParams();
  const tokenId = params.tokenId as string;
  const [searchQuery, setSearchQuery] = useState("");

  const tokenInfo =
    mockTokens.find((t) => t.id.toString() === tokenId) || mockTokens[0];

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap");

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <div className="h-full bg-[#0F0F0F] rounded-[12px] lg:rounded-[14px] p-1.5 sm:p-2 lg:p-2.5 flex flex-col overflow-hidden">
        {/* Desktop Layout */}
        <div className="hidden xl:flex gap-3 flex-1 min-h-0">
          <div className="flex-[0_0_60%] flex flex-col gap-3 min-w-0 max-h-full overflow-hidden">
            {/* Left side - News Feed */}
            <div className="w-full flex-1 h-full flex flex-col">
              <div className="flex-1 bg-black rounded-[14px] border border-[#2C2C2C] overflow-hidden flex flex-col">
                {/* Sticky Search Bar */}
                <div className="sticky top-0 z-10 bg-black p-4 pb-0">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Search tokens"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full border border-[#2C2C2C] rounded-[10px] px-4 py-3 pl-10 text-white text-[14px] placeholder:text-[#666666] focus:outline-none focus:border-[#F7B410] transition-colors"
                      />
                      <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                    <button className="px-4 py-3 border border-[#2C2C2C] rounded-[10px] text-[#999999] text-[14px] font-medium hover:border-[#F7B410] hover:text-[#F7B410] transition-colors flex items-center gap-2">
                      Filter
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Scrollable News Cards */}
                <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3">
                  {mockNewsData.map((news) => (
                    <NewsCard
                      key={news.id}
                      title={news.title}
                      description={news.description}
                      author={news.author}
                      date={news.date}
                      image={news.image}
                      trending={news.trending}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full flex-1 h-full flex">
            <TokenSidebar />
          </div>
        </div>
      </div>
    </>
  );
}
