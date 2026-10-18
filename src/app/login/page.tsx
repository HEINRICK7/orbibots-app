import LoginView from "./LoginView";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  return <LoginView error={params.error} />;
}
