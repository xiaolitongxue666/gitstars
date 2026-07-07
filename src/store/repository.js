import { nextTick } from 'vue';
import { defineStore } from 'pinia';
import { getStarredRepositories } from '@/server/github';
import { STARRED_REPOS } from '@/constants';
import { useTagStore } from '@/store/tag';
import { useRankingStore } from '@/store/ranking';

const PAGE_SIZE = 100;

export const useRepositoryStore = defineStore('repository', {
  state: () => ({
    all: [],
    selectedId: null,
    filterText: '',
    loading: true,
    sortType: 'time',
  }),

  getters: {
    filteredRepositories: (state) => {
      let repositoriesTmp = [];
      const tagStore = useTagStore();
      const rankingStore = useRankingStore();

      if (tagStore.tagSrc === 'star') {
        if (!tagStore.selectedTag) {
          repositoriesTmp = [...state.all];
        } else if (tagStore.selectedTagType === 'topic') {
          const repositoryIds = tagStore.topicMap[tagStore.selectedTag];
          if (repositoryIds) {
            repositoriesTmp = state.all.filter((repository) =>
              repositoryIds.includes(repository.id),
            );
          }
        } else if (tagStore.selectedTagType === 'language') {
          const repositoryIds = tagStore.languageMap[tagStore.selectedTag];
          if (repositoryIds) {
            repositoriesTmp = state.all.filter((repository) =>
              repositoryIds.includes(repository.id),
            );
          }
        }
      } else if (tagStore.tagSrc === 'ranking') {
        if (rankingStore.selectedLanguage) {
          repositoriesTmp = [
            ...(rankingStore.languageMap[rankingStore.selectedLanguage] ?? []),
          ];
        } else {
          repositoriesTmp = [...(rankingStore.languageMap.all ?? [])];
        }
      }

      if (state.filterText) {
        const filterText = state.filterText.toLowerCase();
        repositoriesTmp = repositoriesTmp.filter(
          (repository) =>
            repository.owner.login.toLowerCase().includes(filterText) ||
            repository.name.toLowerCase().includes(filterText) ||
            repository.description?.toLowerCase().includes(filterText),
        );
      }

      if (
        tagStore.tagSrc === 'star' &&
        repositoriesTmp.length > 0 &&
        state.sortType === 'star'
      ) {
        repositoriesTmp.sort((a, b) => b.stargazers_count - a.stargazers_count);
      }

      return repositoriesTmp;
    },

    selectedRepository: (state) => {
      const rankingStore = useRankingStore();
      return (
        state.all.find((item) => item.id === state.selectedId) ||
        rankingStore.repositories.find((item) => item.id === state.selectedId)
      );
    },
  },

  actions: {
    async resolveRepositories() {
      this.loading = true;

      const cached = localStorage.getItem(STARRED_REPOS);
      if (cached) {
        this.all = JSON.parse(cached);
        this.loading = false;
      }

      try {
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const batch = await getStarredRepositories({ page, per_page: PAGE_SIZE });
          if (page === 1 && !cached) {
            this.all = batch;
            this.loading = false;
          } else if (page === 1 && cached) {
            await nextTick();
            this.all = batch;
          } else {
            this.all = [...this.all, ...batch];
          }

          hasMore = batch.length === PAGE_SIZE;
          page += 1;
        }

        localStorage.setItem(STARRED_REPOS, JSON.stringify(this.all));
      } catch (err) {
        console.error('[gitstars] load starred repos failed', err);
        if (!this.all.length) {
          this.loading = false;
        }
      }
    },
  },
});
