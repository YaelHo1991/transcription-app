--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18 (Ubuntu 14.18-0ubuntu0.22.04.1)
-- Dumped by pg_dump version 14.18 (Ubuntu 14.18-0ubuntu0.22.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: transcription_user
--

COPY public.users (id, username, email, password, full_name, permissions, transcriber_code, is_admin, personal_company, created_at, updated_at, last_login, plain_password, password_hint, business_company, is_active) FROM stdin;
1f2e9648-181a-4eeb-882f-058f99421f9c	admin	admin@example.com	$2b$10$K4J5wGxEqvNh5VH9H8Hm1OlFjMGkYv9hR8Qx3wPm7Tn5Bz2Xc4Np6	Admin User	ABCDEF	TRN-0001	t	\N	2025-08-24 13:03:30.378096	2025-08-24 13:03:30.378096	\N	admin123	\N	\N	t
755cd762-8334-4f99-961e-8f7f572835b9	test	test@example.com	$2b$10$K4J5wGxEqvNh5VH9H8Hm1OlFjMGkYv9hR8Qx3wPm7Tn5Bz2Xc4Np6	Test User	ABC	TRN-0002	f	\N	2025-08-24 13:03:30.378096	2025-08-24 13:03:30.378096	\N	test123	\N	\N	t
8de4dc03-b194-47a9-a16d-190ecc99d7ef	demo	demo@example.com	$2b$10$K4J5wGxEqvNh5VH9H8Hm1OlFjMGkYv9hR8Qx3wPm7Tn5Bz2Xc4Np6	Demo User	DEF	TRN-0003	f	\N	2025-08-24 13:03:30.378096	2025-08-24 13:03:30.378096	\N	demo123	\N	\N	t
3134f67b-db84-4d58-801e-6b2f5da0f6a3	ayelho	ayelho@gmail.com	$2b$10$cR3lqUz72NykOHw8u36u0eCUDJAKYFqic3kg5n3y6I6TYqVT/4EVi	יעל הורי	ABCDEF	TRN-8421	t	\N	2025-08-24 16:53:45.124812	2025-08-24 16:53:45.124812	2025-08-25 06:41:38.171277	0i!0B5ui1!	\N	\N	t
21c6c05f-cb60-47f3-b5f2-b9ada3631345	liat	liat@liatbenshai.com	$2b$10$CGoruBlQnOQ6SFl12pqndeq9zvYEXkLLJwTIECej3QjNPyjxhOgti	ליאת בן שי	ABCDEF	TRN-6908	t	\N	2025-08-24 17:00:28.577434	2025-08-24 17:00:28.577434	2025-08-25 06:45:05.222317	!8tw1Kw3!4	\N	\N	t
3beb5bdd-80b2-4878-afbb-0d1974ce6537	a	a@gmail.com	$2b$10$BEIuIizxCE1yvZObL.byluIxeude1G87n1EOed41fVPqWYChhWypy	לירז ניסיון	ABCDEF	TRN-8167	f	\N	2025-08-25 10:24:33.679591	2025-08-25 10:24:33.679591	\N	98!68!plSc	\N	\N	t
\.


--
-- PostgreSQL database dump complete
--

