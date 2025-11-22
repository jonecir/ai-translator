// frontend/src/pages/NotFound.jsx
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="max-w-xl mx-auto text-center py-16">
      <h2 className="text-3xl font-semibold mb-2">404</h2>
      <p className="text-neutral-600 dark:text-neutral-400 mb-6">
        {t("notFound.message")}
      </p>
      <Link
        to="/"
        className="underline"
      >
        {t("notFound.backHome")}
      </Link>
    </div>
  );
}
