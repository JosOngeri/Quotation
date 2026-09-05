package ke.co.josongeri.qms.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import ke.co.josongeri.qms.features.auth.LoginScreen
import ke.co.josongeri.qms.features.dashboard.DashboardScreen
import ke.co.josongeri.qms.features.quotes.QuoteDetailScreen
import ke.co.josongeri.qms.features.quotes.QuotesScreen
import ke.co.josongeri.qms.features.settings.SettingsScreen

object Routes {
    const val LOGIN = "login"
    const val DASHBOARD = "dashboard"
    const val QUOTES = "quotes"
    const val QUOTE_DETAIL = "quote/{id}"
    const val SETTINGS = "settings"

    fun quoteDetail(id: String) = "quote/$id"
}

@Composable
fun AppNavHost(
    startDestination: String,
    navController: NavHostController = rememberNavController(),
) {
    NavHost(navController = navController, startDestination = startDestination) {
        composable(Routes.LOGIN) {
            LoginScreen(
                onLoggedIn = {
                    navController.navigate(Routes.DASHBOARD) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                },
            )
        }
        composable(Routes.DASHBOARD) {
            DashboardScreen(
                onNavigateQuotes = { navController.navigate(Routes.QUOTES) },
                onNavigateSettings = { navController.navigate(Routes.SETTINGS) },
                onLoggedOut = {
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(0) { inclusive = true }
                    }
                },
            )
        }
        composable(Routes.QUOTES) {
            QuotesScreen(
                onBack = { navController.popBackStack() },
                onQuoteClick = { id -> navController.navigate(Routes.quoteDetail(id)) },
            )
        }
        composable(
            route = Routes.QUOTE_DETAIL,
            arguments = listOf(navArgument("id") { type = NavType.StringType }),
        ) {
            QuoteDetailScreen(onBack = { navController.popBackStack() })
        }
        composable(Routes.SETTINGS) {
            SettingsScreen(
                onBack = { navController.popBackStack() },
                onLoggedOut = {
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(0) { inclusive = true }
                    }
                },
            )
        }
    }
}
